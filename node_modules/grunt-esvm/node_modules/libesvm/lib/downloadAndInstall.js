var _ = require('lodash');
var zlib = require('zlib');
var Promises = require('bluebird');
var request = require('request');
var tar = require('tar');
var EventEmitter = require('events').EventEmitter;

/**
 * Download and install a version of Elasticsearch
 * @param {string} version The version to install
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (source, dest, log) {
  log = log || _.noop;
  return new Promises(function (resolve, reject) {
    var gunzip = zlib.createGunzip();
    var out = tar.Extract({ path: dest, strip: 1 });
    var progress = new EventEmitter();
    out.on('close', resolve).on('error', reject);
    request.get(source)
    .on('response', function (resp) {
      progress.level     = 'INFO';
      progress.type      = 'progress';
      progress.op        = 'downloading';
      progress.total     = parseInt(resp.headers['content-length'], 10);
      progress.timestamp = new Date();
      progress.message   = 'Downloading ' + progress.total + ' bytes';
      log(progress);
    })
    .on('data', function (buffer) {
      progress.emit('progress', buffer.length);
    })
    .pipe(gunzip)
    .pipe(out);
  });
};

