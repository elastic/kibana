var _ = require('lodash');
var url = require('url');
var fs = require('fs');
var Promises = require('bluebird');
var zlib = require('zlib');
var tar = require('tar');
var downloadAndInstall = require('./downloadAndInstall');

/**
 * Installs from binary TGZ
 * @param {object} options The options object 
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  var log = options.log || _.noop;
  // if it's a URL we can just reuse the downloadAndInstall
  if (/^http/.test(options.binary)) {  
      log('INFO', 'Download and installing ' + options.binary);
    return downloadAndInstall(options.binary, options.dest, log);
  } else {
    return new Promises(function (resolve, reject) {
      log('INFO', 'Installing ' + options.binary);
      var gunzip = zlib.createGunzip();
      var out = tar.Extract({ path: options.dest, strip: 1 });
      out.on('close', resolve).on('error', reject);
      fs.createReadStream(options.binary)
      .pipe(gunzip)
      .pipe(out);
    });
  }
};
