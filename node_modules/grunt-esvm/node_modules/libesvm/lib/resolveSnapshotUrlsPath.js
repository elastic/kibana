var Promises = require('bluebird');
var join = require('path').join;

/**
 * Resolves the path based on the version
 * @param {string} directory The install directory
 * @param {string} branch The name of the branch
 * @returns {Promise}
 */
module.exports = function (options) {
  return Promises.resolve(join(options.directory, 'snapshot_urls.prop'));
};
