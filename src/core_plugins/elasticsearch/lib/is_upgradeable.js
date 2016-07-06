import semver from 'semver';
const rcVersionRegex = /(\d+\.\d+\.\d+)\-rc(\d+)/i;

module.exports = function (server, doc) {
  const config = server.config();
  if (/alpha|beta|snapshot/i.test(doc._id)) return false;
  if (!doc._id) return false;
  if (doc._id === config.get('pkg.version')) return false;

  let packageRcRelease = Infinity;
  let rcRelease = Infinity;
  let packageVersion = config.get('pkg.version');
  let version = doc._id;
  const matches = doc._id.match(rcVersionRegex);
  const packageMatches = config.get('pkg.version').match(rcVersionRegex);

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
