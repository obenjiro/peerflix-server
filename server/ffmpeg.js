'use strict';

var path = require('path'),
  fs = require('fs'),
  pump = require('pump');

module.exports = function (req, res, torrent, file) {
  var param = req.query.ffmpeg,
    ffmpeg = require('fluent-ffmpeg');

  function probe() {
    var filePath = path.join(torrent.path, file.path);
    fs.exists(filePath, function (exists) {
      if (!exists) {
        return res.status(404).send('File doesn`t exist.');
      }
      return ffmpeg.ffprobe(filePath, function (err, metadata) {
        if (err) {
          console.error(err);
          return res.status(500).send(err.toString());
        }
        res.send(metadata);
      });
    });
  }

  function remux() {
    res.type('video/mp4');
    res.setHeader('Content-Length', file.length);

    var command = ffmpeg(file.createReadStream())
      .videoCodec('libx264').audioCodec('libmp3lame').format('mp4')
      .audioBitrate(128)
      .videoBitrate(1024)
      .outputOptions([
        '-movflags frag_keyframe+empty_moov',
        '-threads 2',
        '-deadline realtime',
        '-error-resilient 1'
      ])
      .on('start', function (cmd) {
        console.log(cmd);
      })
      .on('error', function(err, stdout, stderr) {
        console.log(err.message); //this will likely return "code=1" not really useful
        console.log("stdout:\n" + stdout);
        console.log("stderr:\n" + stderr); //this will contain more detailed debugging info
    })
    pump(command, res);
  }

  switch (param) {
    case 'probe':
      return probe();
    case 'remux':
      return remux();
    default:
      res.status(501).send('Not supported.');
  }
};
