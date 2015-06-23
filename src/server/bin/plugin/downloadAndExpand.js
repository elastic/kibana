var _ = require('lodash');
var zlib = require('zlib');
var Promise = require('bluebird');
var request = require('request');
var tar = require('tar');
var Path = require('path');
var fs = Promise.promisifyAll(require('fs'));
var EventEmitter = require('events').EventEmitter;

module.exports = function (source, dest, downloadLogger) {
  downloadLogger = downloadLogger || _.noop;
  return new Promise(function (resolve, reject) {
    var gunzip = zlib.createGunzip();
    var progress = new EventEmitter();

    var tarExtract = tar.Extract({ path: dest, strip: 1 });

    request.get(source)
    .on('response', function (resp) {
      var total = parseInt(resp.headers['content-length'], 10);
      var docInfo = {
        level: 'INFO',
        type: 'progress',
        op: 'downloading',
        total: total,
        timestamp: new Date(),
        message: 'Downloading ' + total + ' bytes'
      };

      downloadLogger(progress, docInfo);
    })
    .on('data', function (buffer) {
      progress.emit('progress', buffer.length);
    })
    .on('error', reject)
    .on('end', function () {
      progress.emit('message', '\nDownload Complete.\n');
      progress.emit('message', 'Extracting archive.\n');
    })
    .pipe(gunzip)
    .on('error', reject)
    .pipe(tarExtract)
    .on('end', function () {
      progress.emit('message', 'Extraction complete.\n');
      resolve();
    })
    .on('error', reject);
  });
};