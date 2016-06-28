var resolveVersion = require('./resolveVersion');
var Promises = require('bluebird');
var join = require('path').join;

/**
 * Resolves the path based on the version 
 * @param {string} directory The install directory
 * @param {string} branch The name of the branch
 * @returns {Promise}
 */
module.exports = function (directory, branch, cb) {
  var path = join(directory, 'branch-'+branch);
  return Promises.resolve(path).nodeify(cb);
};
