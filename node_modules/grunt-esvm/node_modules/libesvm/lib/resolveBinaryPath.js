var Promises = require('bluebird');
var resolveVersion = require('./resolveVersion');
var crypto = require('crypto');
var join = require('path').join;

/**
 * Resolves the path based on the source of the file 
 * @param {string} directory The install directory
 * @param {string} path The path of the source file
 * @returns {Promise}
 */
module.exports = function (directory, path, cb) {
  var hash = crypto.createHash('sha1').update(path).digest('hex');
  var dest = join(directory, hash);
  return Promises.resolve(dest).nodeify(cb);
};

