var resolveVersion = require('./resolveVersion');
var join           = require('path').join;
var Promises       = require('bluebird');

/**
 * Resolves the path based on the version 
 * @returns {Promise}
 */
module.exports = function (directory, version, cb) {
  var path = resolveVersion({ version: version }).then(function (resolvedVersion) {
    return join(directory, resolvedVersion);
  });
  return Promises.resolve(path).nodeify(cb);
};
