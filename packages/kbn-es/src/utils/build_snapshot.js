/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const execa = require('execa');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { createCliError } = require('../errors');
const { findMostRecentlyChanged } = require('../utils');
const { GRADLE_BIN } = require('../paths');

const onceEvent = (emitter, event) => new Promise((resolve) => emitter.once(event, resolve));

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
exports.buildSnapshot = async ({ license, sourcePath, log, platform = os.platform() }) => {
  const { task, ext } = exports.archiveForPlatform(platform, license);
  const buildArgs = [`:distribution:archives:${task}:assemble`];

  log.info('%s %s', GRADLE_BIN, buildArgs.join(' '));
  log.debug('cwd:', sourcePath);

  const build = execa(GRADLE_BIN, buildArgs, {
    cwd: sourcePath,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = readline.createInterface({ input: build.stdout });
  const stderr = readline.createInterface({ input: build.stderr });

  stdout.on('line', (line) => log.debug(line));
  stderr.on('line', (line) => log.error(line));

  const [exitCode] = await Promise.all([
    Promise.race([
      onceEvent(build, 'exit'),
      onceEvent(build, 'error').then((error) => {
        throw createCliError(`Error spawning gradle: ${error.message}`);
      }),
    ]),
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
};

exports.archiveForPlatform = (platform, license) => {
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
};
