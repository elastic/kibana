const childProcess = require('child_process');
const path = require('path');
const chalk = require('chalk');
const simpleGit = require('simple-git');
const { installArchive } = require('./archive');
const { findMostRecentlyChanged, log } = require('../utils');
const { GRADLE_BIN, ES_ARCHIVE_PATTERN, BASE_PATH } = require('../paths');

/**
 * Installs ES from source
 *
 * @param {Object} options
 * @property {String} options.installPath
 * @property {String} options.sourcePath
 */
exports.installSource = async function installSource({
  sourcePath,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, 'source'),
}) {
  const branchName = await getBranchName(sourcePath);

  log.info('source path: %s', chalk.bold(sourcePath));
  log.info('install path: %s', chalk.bold(installPath));
  log.info('on branch %s', chalk.bold(branchName));

  const archive = await createSnapshot({ sourcePath });

  await installArchive(archive, { basePath, installPath });

  return { installPath };
};

/**
 * Creates archive from source
 *
 * @param {Object} options
 * @property {String} options.sourcePath
 * @returns {Object} containing archive and optional plugins
 */
async function createSnapshot({ sourcePath }) {
  const buildArgs = [':distribution:archives:tar:assemble'];

  childProcess.execFileSync(GRADLE_BIN, buildArgs, {
    cwd: sourcePath,
  });

  const esTarballPath = findMostRecentlyChanged(
    path.resolve(sourcePath, ES_ARCHIVE_PATTERN)
  );

  return esTarballPath;
}

async function getBranchName(cwd) {
  const git = simpleGit(cwd);

  return new Promise((resolve, reject) => {
    git.branchLocal((error, branches) => {
      if (error) {
        reject(error);
      }

      resolve(branches.current);
    });
  });
}
