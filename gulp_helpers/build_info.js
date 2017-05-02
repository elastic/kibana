const path = require('path');
const yargs = require('yargs');
const semver = require('semver');
const simpleGit = require('simple-git');
const pkg = require('../package.json');

const gitDir = path.resolve(__dirname, '..');

function gitInfo() {
  const git = simpleGit(gitDir);

  return new Promise((resolve, reject) => {
    git.log((err, log) => {
      if (err) return reject(err);
      resolve({
        number: log.total,
        sha: log.latest.hash,
      });
    });
  });
}

yargs
.alias('r', 'release').describe('r', 'Create a release build, not a snapshot');
const argv = yargs.argv;

function getVersion() {
  const { version } = pkg;
  if (!version) {
    throw new Error('No version found in package.json');
  }
  if (!semver.valid(version)) {
    throw new Error(`Version is not valid semver: ${version}`);
  }

  const snapshotText = (argv.release) ? '' : '-SNAPSHOT';
  return `${version}${snapshotText}`;
}

function buildInfo() {
  return gitInfo()
  .then((info) => ({
    name: pkg.name,
    version: getVersion(),
    buildNumber: info.number,
    commitSHA: info.sha,
  }));
}

module.exports = buildInfo;