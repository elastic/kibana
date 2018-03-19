const execa = require('execa');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const crypto = require('crypto');
const simpleGit = require('simple-git/promise');
const { installArchive } = require('./archive');
const { findMostRecentlyChanged, log: defaultLog, cache } = require('../utils');
const { GRADLE_BIN, ES_ARCHIVE_PATTERN, BASE_PATH } = require('../paths');

/**
 * Installs ES from source
 *
 * @param {Object} options
 * @property {String} options.sourcePath
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.installSource = async function installSource({
  sourcePath,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, 'source'),
  log = defaultLog,
}) {
  log.info('source path: %s', chalk.bold(sourcePath));
  log.info('install path: %s', chalk.bold(installPath));

  const { filename, etag } = await sourceInfo(sourcePath, log);
  const cacheDest = path.resolve(basePath, 'cache', filename);

  const cacheMeta = cache.readMeta(cacheDest);
  const isCached = cacheMeta.exists && cacheMeta.etag === etag;
  const archive = isCached
    ? cacheDest
    : await createSnapshot({ sourcePath, log });

  if (isCached) {
    log.info(
      'source path unchanged since %s, using cache',
      chalk.bold(cacheMeta.ts)
    );
  } else {
    cache.writeMeta(cacheDest, { etag });
    fs.copyFileSync(archive, cacheDest);
  }

  return await installArchive(cacheDest, { basePath, installPath, log });
};

/**
 *
 * @param {String} cwd
 * @param {ToolingLog} log
 */
async function sourceInfo(cwd, log = defaultLog) {
  if (!fs.existsSync(cwd)) {
    throw new Error(`${cwd} does not exist`);
  }

  const git = simpleGit(cwd);

  const status = await git.status();
  const branch = status.current;
  const sha = (await git.revparse(['HEAD'])).trim();

  log.info('on %s at %s', chalk.bold(branch), chalk.bold(sha));
  log.info('%s locally modified file(s)', chalk.bold(status.modified.length));

  const etag = crypto
    .createHash('md5')
    .update(sha + JSON.stringify(status))
    .digest('hex');

  const filename = crypto
    .createHash('md5')
    .update(`${status.current}${cwd}`)
    .digest('hex');

  return {
    etag,
    filename: `${filename}.tar.gz`,
    branch,
  };
}

/**
 * Creates archive from source
 *
 * @param {Object} options
 * @property {String} options.sourcePath
 * @property {ToolingLog} options.log
 * @returns {Object} containing archive and optional plugins
 */
async function createSnapshot({ sourcePath, log = defaultLog }) {
  const buildArgs = [':distribution:archives:tar:assemble'];

  log.info('%s %s', GRADLE_BIN, buildArgs.join(' '));
  await execa(GRADLE_BIN, buildArgs, {
    cwd: sourcePath,
  });

  const esTarballPath = findMostRecentlyChanged(
    path.resolve(sourcePath, ES_ARCHIVE_PATTERN)
  );

  return esTarballPath;
}
