/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const chalk = require('chalk');
const path = require('path');
const { BASE_PATH } = require('../paths');
const { installArchive } = require('./archive');
const { log: defaultLog } = require('../utils');
const { Artifact } = require('../artifact');

/**
 * Download an ES snapshot
 *
 * @param {Object} options
 * @property {('oss'|'basic'|'trial')} options.license
 * @property {String} options.version
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.downloadSnapshot = async function installSnapshot({
  license = 'basic',
  version,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, version),
  log = defaultLog,
}) {
  log.info('version: %s', chalk.bold(version));
  log.info('install path: %s', chalk.bold(installPath));
  log.info('license: %s', chalk.bold(license));

  const artifact = await Artifact.getSnapshot(license, version, log);
  const dest = path.resolve(basePath, 'cache', artifact.getFilename());
  await artifact.download(dest);

  return {
    downloadPath: dest,
  };
};

/**
 * Installs ES from snapshot
 *
 * @param {Object} options
 * @property {('oss'|'basic'|'trial')} options.license
 * @property {String} options.password
 * @property {String} options.version
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.installSnapshot = async function installSnapshot({
  license = 'basic',
  password = 'password',
  version,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, version),
  log = defaultLog,
  esArgs,
}) {
  const { downloadPath } = await exports.downloadSnapshot({
    license,
    version,
    basePath,
    installPath,
    log,
  });

  return await installArchive(downloadPath, {
    license,
    password,
    basePath,
    installPath,
    log,
    esArgs,
  });
};
