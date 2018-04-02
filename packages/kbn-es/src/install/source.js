const execa = require('execa');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
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

  const etag = crypto.createHash('md5').update(branch);
  etag.update(sha);

  // for changed files, use last modified times in hash calculation
  status.files.forEach(file => {
    etag.update(fs.statSync(path.join(cwd, file.path)).mtime.toString());
  });

  const cwdHash = crypto
    .createHash('md5')
    .update(cwd)
    .digest('hex');

  return {
    etag: etag.digest('hex'),
    filename: `${branch}-${cwdHash.substr(0, 8)}.tar.gz`,
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
function createSnapshot({ sourcePath, log = defaultLog }) {
  const buildArgs = [':distribution:archives:tar:assemble'];

  return new Promise((resolve, reject) => {
    log.info('%s %s', GRADLE_BIN, buildArgs.join(' '));

    const build = execa(GRADLE_BIN, buildArgs, {
      cwd: sourcePath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdout = readline.createInterface({ input: build.stdout });
    const stderr = readline.createInterface({ input: build.stderr });

    stdout.on('line', line => log.debug(line));
    stderr.on('line', line => log.error(line));

    build.stdout.on('end', () => {
      if (build.exitCode > 0) {
        reject(new Error('unable to build ES'));
      } else {
        const esTarballPath = findMostRecentlyChanged(
          path.resolve(sourcePath, ES_ARCHIVE_PATTERN)
        );

        resolve(esTarballPath);
      }
    });
  });
}
