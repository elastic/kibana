var _ = require('lodash');
var fetchAllTags = require('./fetchAllTags');
var semver = require('semver');

// match valid tag names and extract that parts that we want semver to consider
var TAG_PARTS_RE = /^v?(\d+\.\d+\.\d+)(?:\.([a-zA-Z0-9_\-]+))?$/;

function mapTagToSemver(version) {
  var matches = version.match(TAG_PARTS_RE);
  if (!matches) return undefined;
  return matches[1] + (matches[2] ? '-' + matches[2] : '');
}

/**
 * Resolve the latest version
 * @param {string} version A semver string
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  return fetchAllTags().then(function (tags) {
    var versions = _(tags.releases).keys().map(String).invoke('trim').value();
    var validVersions = versions.filter(Boolean).sort(semver.rcompare);
    var version = _.find(validVersions, function (tag) {
      return semver.satisfies(tag, options.version);
    });

    if (version) return version;

    var error = 'Unable to find a version for "' + options.version + '"';
    var invalidVersions = _.difference(versions, validVersions);
    if (validVersions.length) {
      error += ' in "' + validVersions.join('", "') + '"';
    }
    if (invalidVersions.length) {
      error += ' with invalid versions "' + invalidVersions.join('", "') + '"';
    }

    throw new Error(error);
  });
};
