/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const execa = require('execa');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');
const chalk = require('chalk');
const crypto = require('crypto');
const simpleGit = require('simple-git/promise');
const { installArchive } = require('./archive');
const { createCliError } = require('../errors');
const { findMostRecentlyChanged, log: defaultLog, cache } = require('../utils');
const { GRADLE_BIN, BASE_PATH } = require('../paths');

const onceEvent = (emitter, event) => new Promise(resolve => emitter.once(event, resolve));

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
  const archive = isCached ? dest : await createSnapshot({ sourcePath, log, license });

  if (isCached) {
    log.info('source path unchanged since %s, using cache', chalk.bold(cacheMeta.ts));
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

  const { task, ext } = archiveForPlatform(os.platform(), license);
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

  const basename = `${branch}-${task}-${cwdHash}`;
  const filename = `${basename}.${ext}`;

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
 *
 * Gradle tasks:
 *   :distribution:archives:darwin-tar:assemble
 *   :distribution:archives:linux-tar:assemble
 *   :distribution:archives:windows-zip:assemble
 *   :distribution:archives:oss-darwin-tar:assemble
 *   :distribution:archives:oss-linux-tar:assemble
 *   :distribution:archives:oss-windows-zip:assemble
 */
async function createSnapshot({ license, sourcePath, log = defaultLog }) {
  const { task, ext } = archiveForPlatform(os.platform(), license);
  const buildArgs = [`:distribution:archives:${task}:assemble`];

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

  const archivePattern = `distribution/archives/${task}/build/distributions/elasticsearch-*.${ext}`;
  const esArchivePath = findMostRecentlyChanged(path.resolve(sourcePath, archivePattern));

  if (!esArchivePath) {
    throw createCliError('could not locate ES distribution');
  }

  return esArchivePath;
}

function archiveForPlatform(platform, license) {
  const taskPrefix = license === 'oss' ? 'oss-' : '';

  switch (platform) {
    case 'darwin':
      return { format: 'tar', ext: 'tar.gz', task: `${taskPrefix}darwin-tar`, platform: 'darwin' };
    case 'win32':
      return { format: 'zip', ext: 'zip', task: `${taskPrefix}windows-zip`, platform: 'windows' };
    case 'linux':
      return { format: 'tar', ext: 'tar.gz', task: `${taskPrefix}linux-tar`, platform: 'linux' };
    default:
      throw new Error(`unknown platform: ${platform}`);
  }
}
