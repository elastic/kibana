import semver from 'semver';
const rcVersionRegex = /(\d+\.\d+\.\d+)\-rc(\d+)/i;

export default function (server, configSavedObject) {
  const config = server.config();
  if (/alpha|beta|snapshot/i.test(configSavedObject.id)) return false;
  if (!configSavedObject.id) return false;
  if (configSavedObject.id === config.get('pkg.version')) return false;

  let packageRcRelease = Infinity;
  let rcRelease = Infinity;
  let packageVersion = config.get('pkg.version');
  let version = configSavedObject.id;
  const matches = configSavedObject.id.match(rcVersionRegex);
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
}
