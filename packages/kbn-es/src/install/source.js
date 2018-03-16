const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const crypto = require('crypto');
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
  log.info('source path: %s', chalk.bold(sourcePath));
  log.info('install path: %s', chalk.bold(installPath));

  const hash = await sourceHash(sourcePath);
  const cacheDest = path.resolve(basePath, 'cache', 'source.tar.gz');

  const isCached = isValidCache(cacheDest, hash);
  const archive = isCached ? cacheDest : await createSnapshot({ sourcePath });

  if (isCached) {
    log.info('source path unchanged, using cache');
  } else {
    fs.writeFileSync(`${cacheDest}.hash`, hash);
    fs.copyFileSync(archive, cacheDest);
  }

  return await installArchive(archive, { basePath, installPath });
};

function isValidCache(cachedArchive, hash) {
  try {
    const cachedHash = fs.readFileSync(`${cachedArchive}.hash`, {
      encoding: 'utf8',
    });

    return cachedHash === hash;
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

function sourceHash(cwd) {
  const git = simpleGit(cwd);

  return new Promise((resolve, reject) => {
    git.status((error, status) => {
      if (error) {
        return reject(error);
      }

      log.info(
        'on %s tracking %s',
        chalk.bold(status.current),
        chalk.bold(status.tracking)
      );

      log.info(
        '%s locally modified file(s)',
        chalk.bold(status.modified.length)
      );

      const hash = crypto
        .createHash('md5')
        .update(JSON.stringify(status))
        .digest('hex');

      resolve(hash);
    });
  });
}

/**
 * Creates archive from source
 *
 * @param {Object} options
 * @property {String} options.sourcePath
 * @returns {Object} containing archive and optional plugins
 */
async function createSnapshot({ sourcePath }) {
  const buildArgs = [':distribution:archives:tar:assemble'];

  log.debug('%s %s', GRADLE_BIN, buildArgs.join(' '));
  childProcess.execFileSync(GRADLE_BIN, buildArgs, {
    cwd: sourcePath,
  });

  const esTarballPath = findMostRecentlyChanged(
    path.resolve(sourcePath, ES_ARCHIVE_PATTERN)
  );

  return esTarballPath;
}
