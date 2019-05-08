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

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const execa = require('execa');
const del = require('del');
const url = require('url');
const { log: defaultLog, decompress } = require('../utils');
const { BASE_PATH, ES_CONFIG, ES_KEYSTORE_BIN } = require('../paths');
const { Artifact } = require('../artifact');

/**
 * Extracts an ES archive and optionally installs plugins
 *
 * @param {String} archive - path to tar
 * @param {Object} options
 * @property {('oss'|'basic'|'trial')} options.license
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.installArchive = async function installArchive(archive, options = {}) {
  const {
    license = 'basic',
    password = 'changeme',
    basePath = BASE_PATH,
    installPath = path.resolve(basePath, path.basename(archive, '.tar.gz')),
    log = defaultLog,
  } = options;

  let dest = archive;
  if (['http:', 'https:'].includes(url.parse(archive).protocol)) {
    const artifact = await Artifact.getArchive(archive, log);
    dest = path.resolve(basePath, 'cache', artifact.getFilename());
    await artifact.download(dest);
  }

  if (fs.existsSync(installPath)) {
    log.info('install directory already exists, removing');
    await del(installPath, { force: true });
  }

  log.info('extracting %s', chalk.bold(dest));
  await decompress(dest, installPath);
  log.info('extracted to %s', chalk.bold(installPath));

  if (license !== 'oss') {
    // starting in 6.3, security is disabled by default. Since we bootstrap
    // the keystore, we can enable security ourselves.
    await appendToConfig(installPath, 'xpack.security.enabled', 'true');

    await appendToConfig(installPath, 'xpack.license.self_generated.type', license);
    await configureKeystore(installPath, password, log);
  }

  return { installPath };
};

/**
 * Appends single line to elasticsearch.yml config file
 *
 * @param {String} installPath
 * @param {String} key
 * @param {String} value
 */
async function appendToConfig(installPath, key, value) {
  fs.appendFileSync(path.resolve(installPath, ES_CONFIG), `${key}: ${value}\n`, 'utf8');
}

/**
 * Creates and configures Keystore
 *
 * @param {String} installPath
 * @param {String} password
 * @param {ToolingLog} log
 */
async function configureKeystore(installPath, password, log = defaultLog) {
  log.info('setting bootstrap password to %s', chalk.bold(password));

  await execa(ES_KEYSTORE_BIN, ['create'], { cwd: installPath });

  await execa(ES_KEYSTORE_BIN, ['add', 'bootstrap.password', '-x'], {
    input: password,
    cwd: installPath,
  });
}
