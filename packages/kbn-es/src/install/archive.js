/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
const { parseSettings, SettingsFilter } = require('../settings');

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
    bundledJDK = false,
    esArgs = [],
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

  const tmpdir = path.resolve(installPath, 'ES_TMPDIR');
  fs.mkdirSync(tmpdir, { recursive: true });
  log.info('created %s', chalk.bold(tmpdir));

  if (license !== 'oss') {
    // starting in 6.3, security is disabled by default. Since we bootstrap
    // the keystore, we can enable security ourselves.
    await appendToConfig(installPath, 'xpack.security.enabled', 'true');

    await appendToConfig(installPath, 'xpack.license.self_generated.type', license);
    await configureKeystore(installPath, log, bundledJDK, [
      ['bootstrap.password', password],
      ...parseSettings(esArgs, { filter: SettingsFilter.SecureOnly }),
    ]);
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
 * @param {ToolingLog} log
 * @param {boolean} bundledJDK
 * @param {Array<[string, string]>} secureSettings List of custom Elasticsearch secure settings to
 * add into the keystore.
 */
async function configureKeystore(
  installPath,
  log = defaultLog,
  bundledJDK = false,
  secureSettings
) {
  const env = {};
  if (bundledJDK) {
    env.JAVA_HOME = '';
  }
  await execa(ES_KEYSTORE_BIN, ['create'], { cwd: installPath, env });

  for (const [secureSettingName, secureSettingValue] of secureSettings) {
    log.info(
      `setting secure setting %s to %s`,
      chalk.bold(secureSettingName),
      chalk.bold(secureSettingValue)
    );
    await execa(ES_KEYSTORE_BIN, ['add', secureSettingName, '-x'], {
      input: secureSettingValue,
      cwd: installPath,
      env,
    });
  }
}
