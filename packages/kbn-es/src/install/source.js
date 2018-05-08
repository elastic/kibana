const execa = require('execa');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');
const crypto = require('crypto');
const simpleGit = require('simple-git/promise');
const { installArchive } = require('./archive');
const { createCliError } = require('../errors');
const { findMostRecentlyChanged, log: defaultLog, cache } = require('../utils');
const {
  GRADLE_BIN,
  ES_ARCHIVE_PATTERN,
  ES_OSS_ARCHIVE_PATTERN,
  BASE_PATH,
} = require('../paths');

const onceEvent = (emitter, event) =>
  new Promise(resolve => emitter.once(event, resolve));

/**
 * Installs ES from source
 *
 * @param {Object} options
 * @property {('oss'|'basic'|'trial')} options.license
 * @property {String} options.password
 * @property {String} options.sourcePath
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.installSource = async function installSource({
  license = 'basic',
  password = 'changeme',
  sourcePath,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, 'source'),
  log = defaultLog,
}) {
  log.info('source path: %s', chalk.bold(sourcePath));
  log.info('install path: %s', chalk.bold(installPath));
  log.info('license: %s', chalk.bold(license));

  const metadata = await sourceInfo(sourcePath, license, log);
  const dest = path.resolve(basePath, 'cache', metadata.filename);

  const cacheMeta = cache.readMeta(dest);
  const isCached = cacheMeta.exists && cacheMeta.etag === metadata.etag;
  const archive = isCached
    ? dest
    : await createSnapshot({ sourcePath, log, license });

  if (isCached) {
    log.info(
      'source path unchanged since %s, using cache',
      chalk.bold(cacheMeta.ts)
    );
  } else {
    cache.writeMeta(dest, metadata);
    fs.copyFileSync(archive, dest);
  }

  return await installArchive(dest, {
    license,
    password,
    basePath,
    installPath,
    log,
  });
};

/**
 *
 * @param {String} cwd
 * @param {ToolingLog} log
 */
async function sourceInfo(cwd, license, log = defaultLog) {
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
    .digest('hex')
    .substr(0, 8);

  const basename = `${branch}${license === 'oss' ? '-oss-' : '-'}${cwdHash}`;
  const filename = `${basename}.tar.gz`;

  return {
    etag: etag.digest('hex'),
    filename,
    cwd,
    branch,
  };
}

/**
 * Creates archive from source
 *
 * @param {Object} options
 * @property {('oss'|'basic'|'trial')} options.license
 * @property {String} options.sourcePath
 * @property {ToolingLog} options.log
 * @returns {Object} containing archive and optional plugins
 */
async function createSnapshot({ license, sourcePath, log = defaultLog }) {
  const tarTask = license === 'oss' ? 'oss-tar' : 'tar';
  const buildArgs = [`:distribution:archives:${tarTask}:assemble`];

  log.info('%s %s', GRADLE_BIN, buildArgs.join(' '));

  const build = execa(GRADLE_BIN, buildArgs, {
    cwd: sourcePath,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = readline.createInterface({ input: build.stdout });
  const stderr = readline.createInterface({ input: build.stderr });

  stdout.on('line', line => log.debug(line));
  stderr.on('line', line => log.error(line));

  const [exitCode] = await Promise.all([
    onceEvent(build, 'exit'),
    onceEvent(stdout, 'close'),
    onceEvent(stderr, 'close'),
  ]);

  if (exitCode > 0) {
    throw createCliError('unable to build ES');
  }

  const archivePattern =
    license === 'oss' ? ES_OSS_ARCHIVE_PATTERN : ES_ARCHIVE_PATTERN;
  const esTarballPath = findMostRecentlyChanged(
    path.resolve(sourcePath, archivePattern)
  );

  if (!esTarballPath) {
    throw createCliError('could not locate ES distribution');
  }

  return esTarballPath;
}
