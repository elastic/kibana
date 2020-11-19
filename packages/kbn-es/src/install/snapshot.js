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
  bundledJDK = true,
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
    bundledJDK,
    esArgs,
  });
};
