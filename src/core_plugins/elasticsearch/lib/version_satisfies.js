import semver from 'semver';

module.exports = function (actual, expected) {
  try {
    const ver = cleanVersion(actual);
    return semver.satisfies(ver, expected);
  } catch (err) {
    return false;
  }

  function cleanVersion(version) {
    const match = version.match(/\d+\.\d+\.\d+/);
    if (!match) return version;
    return match[0];
  }
};
