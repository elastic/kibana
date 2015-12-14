var semver = require('semver');

module.exports = function (actual, expected) {
  try {
    var ver = cleanVersion(actual);
    return semver.satisfies(ver, expected);
  } catch (err) {
    return false;
  }

  function cleanVersion(version) {
    var match = version.match(/\d+\.\d+\.\d+/);
    if (!match) return version;
    return match[0];
  }
};
