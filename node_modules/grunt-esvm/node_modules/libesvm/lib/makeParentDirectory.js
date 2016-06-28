var mkdirp = require('mkdirp');
var resolve = require('path').resolve;
var Promises = require('bluebird');
Promises.promisifyAll(mkdirp);

/**
 * Makes the parent directory to the destination
 * @param {string} dest The destination
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (dest, cb) {
  var parentDir = resolve(dest, '..'); 
  return mkdirp.mkdirpAsync(parentDir).then(function () {
    return dest;
  }).nodeify(cb); 
};

