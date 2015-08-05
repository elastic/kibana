var semver = require('semver');
var utils = require('requirefrom')('src/utils');
var rcVersionRegex = /(\d+\.\d+\.\d+)\-rc(\d+)/i;

module.exports = function (server, doc) {
  var config = server.config();
  if (/beta|snapshot/i.test(doc._id)) return false;
  if (!doc._id) return false;
  if (doc._id === config.get('pkg.version')) return false;

  var packageRcRelease = Infinity;
  var rcRelease = Infinity;
  var packageVersion = config.get('pkg.version');
  var version = doc._id;
  var matches = doc._id.match(rcVersionRegex);
  var packageMatches = config.get('pkg.version').match(rcVersionRegex);

  if (matches) {
    version = matches[1];
    rcRelease = parseInt(matches[2], 10);
  }

  if (packageMatches) {
    packageVersion = packageMatches[1];
    packageRcRelease = parseInt(packageMatches[2], 10);
  }

  try {
    if (semver.gte(version, packageVersion) && rcRelease >= packageRcRelease) return false;
  } catch (e) {
    return false;
  }
  return true;
};
