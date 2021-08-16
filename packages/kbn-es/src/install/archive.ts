/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import execa from 'execa';
import del from 'del';
import url from 'url';
import { extract, ToolingLog } from '@kbn/dev-utils';
import { log as defaultLog } from '../utils';
import { BASE_PATH, ES_CONFIG, ES_KEYSTORE_BIN } from '../paths';
import { Artifact } from '../artifact';
import { parseSettings, SettingsFilter } from '../settings';
import { LicenseLevel } from '../types';

/**
 * Extracts an ES archive and optionally installs plugins
 *
 * @param {String} archivePath - path to tar
 * @param {Object} options
 * @property {('oss'|'basic'|'trial')} options.license
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 * @property {String} options.password
 * @property {String[]} options.esArgs
 */
export async function installArchive(
  archivePath: string,
  options: {
    license?: LicenseLevel;
    password?: string;
    basePath?: string;
    installPath?: string;
    log?: ToolingLog;
    esArgs?: string[];
  } = {}
) {
  const {
    license = 'basic',
    password = 'changeme',
    basePath = BASE_PATH,
    installPath = path.resolve(basePath, path.basename(archivePath, '.tar.gz')),
    log = defaultLog,
    esArgs = [],
  } = options;

  let dest = archivePath;
  if (['http:', 'https:'].includes(url.parse(archivePath).protocol ?? '')) {
    const artifact = await Artifact.getArchive(archivePath, log);
    dest = path.resolve(basePath, 'cache', artifact.getFilename());
    await artifact.download(dest);
  }

  if (fs.existsSync(installPath)) {
    log.info('install directory already exists, removing');
    await del(installPath, { force: true });
  }

  log.info('extracting %s', chalk.bold(dest));
  await extract({
    archivePath: dest,
    targetDir: installPath,
    stripComponents: 1,
  });
  log.info('extracted to %s', chalk.bold(installPath));

  const tmpdir = path.resolve(installPath, 'ES_TMPDIR');
  fs.mkdirSync(tmpdir, { recursive: true });
  log.info('created %s', chalk.bold(tmpdir));

  if (license !== 'oss') {
    // starting in 6.3, security is disabled by default. Since we bootstrap
    // the keystore, we can enable security ourselves.
    await appendToConfig(installPath, 'xpack.security.enabled', 'true');

    await appendToConfig(installPath, 'xpack.license.self_generated.type', license);
    await configureKeystore(installPath, log, [
      ['bootstrap.password', password],
      ...parseSettings(esArgs, { filter: SettingsFilter.SecureOnly }),
    ]);
  }

  return { installPath };
}

/**
 * Appends single line to elasticsearch.yml config file
 *
 * @param {String} installPath
 * @param {String} key
 * @param {String} value
 */
async function appendToConfig(installPath: string, key: string, value: string) {
  fs.appendFileSync(path.resolve(installPath, ES_CONFIG), `${key}: ${value}\n`, 'utf8');
}

/**
 * Creates and configures Keystore
 *
 * @param {String} installPath
 * @param {ToolingLog} log
 * @param {Array<[string, string]>} secureSettings List of custom Elasticsearch secure settings to
 * add into the keystore.
 */
async function configureKeystore(
  installPath: string,
  log = defaultLog,
  secureSettings: Array<[string, string]>
) {
  const env = { JAVA_HOME: '' };
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
