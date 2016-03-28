var downloadAndInstall = require('./downloadAndInstall');
var fetchAllTags = require('./fetchAllTags');
var _ = require('lodash');


/**
 * Install from a branch
 * @param {object} options The options object
 * @param {string} options.dest The destination directory
 * @param {string} options.branch The branch name
 * @param {function} [options.log] The logging function
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  var log = options.log || _.noop;
  var branch = options.branch;
  return fetchAllTags()
  .then(function (tags) {
    if (!tags.branches[branch]) {
      throw new Error('Branch ' + branch + ' is not available for install.');
    }
    var url = tags.branches[branch].tarball;
    log('INFO', 'Downloading & installing from "' + options.branch + '" branch.');
    return downloadAndInstall(url, options.dest, log).nodeify(cb);
  });
};
