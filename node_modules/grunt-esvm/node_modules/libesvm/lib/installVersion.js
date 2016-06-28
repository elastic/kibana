var Promise = require('bluebird');
var resolveVersion = require('./resolveVersion');
var _ = require('lodash');
var downloadAndInstall = require('./downloadAndInstall');
var fetchAllTags = require('./fetchAllTags');

/**
 * Download Elasticsearch
 * @param {object} options The options object
 * @param {string} options.dest The destination of the install
 * @param {string} options.version The version to install
 * @param {function} [options.log] The logger
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  var log = options.log || _.noop;
  // Resolve the current version
  return Promise.props({
    version: resolveVersion(options),
    tags: fetchAllTags()
  })
  .then(function (results) {
    var version = results.version;
    var tags = results.tags;
    var url = tags.releases[version].tarball;
    log('INFO', 'Downloading & Installing ' + version);
    return downloadAndInstall(url, options.dest, log);
  })
  .nodeify(cb);
};

