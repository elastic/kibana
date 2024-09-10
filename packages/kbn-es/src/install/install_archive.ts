/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';

import chalk from 'chalk';
import execa from 'execa';
import del from 'del';
import { extract } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';

import { BASE_PATH, ES_CONFIG, ES_KEYSTORE_BIN } from '../paths';
import { Artifact } from '../artifact';
import { parseSettings, SettingsFilter } from '../settings';
import { log as defaultLog, isFile, copyFileSync } from '../utils';
import { InstallArchiveOptions } from './types';

const isHttpUrl = (str: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(str).protocol);
  } catch {
    return false;
  }
};

/**
 * Extracts an ES archive and optionally installs plugins
 */
export async function installArchive(archive: string, options?: InstallArchiveOptions) {
  const {
    license = 'basic',
    password = 'changeme',
    basePath = BASE_PATH,
    installPath = path.resolve(basePath, path.basename(archive, '.tar.gz')),
    log = defaultLog,
    esArgs = [],
    disableEsTmpDir = process.env.FTR_DISABLE_ES_TMPDIR?.toLowerCase() === 'true',
    resources,
  } = options || {};

  let dest = archive;
  if (isHttpUrl(archive)) {
    const artifact = await Artifact.getArchive(archive, log);
    dest = path.resolve(basePath, 'cache', artifact.spec.filename);
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

  /**
   * If we're running inside a Vagrant VM, and this is running in a synced folder,
   * ES will fail to start due to ML being unable to write a pipe in the synced folder.
   * Disabling allows ES to write to the OS's /tmp directory.
   */
  if (!disableEsTmpDir) {
    const tmpdir = path.resolve(installPath, 'ES_TMPDIR');
    fs.mkdirSync(tmpdir, { recursive: true });
    log.info('created %s', chalk.bold(tmpdir));
  }

  // starting in 6.3, security is disabled by default. Since we bootstrap
  // the keystore, we can enable security ourselves.
  await appendToConfig(installPath, 'xpack.security.enabled', 'true');

  await appendToConfig(installPath, 'xpack.license.self_generated.type', license);
  await configureKeystore(installPath, log, [
    ['bootstrap.password', password],
    ...parseSettings(esArgs, { filter: SettingsFilter.SecureOnly }),
  ]);

  // copy resources to ES config directory
  if (resources) {
    resources.forEach((resource) => {
      if (!isFile(resource)) {
        throw new Error(
          `Invalid resource: '${resource}'.\nOnly valid files can be copied to ES config directory`
        );
      }

      const filename = path.basename(resource);
      const destPath = path.resolve(installPath, 'config', filename);

      copyFileSync(resource, destPath);
      log.info('moved %s in config to %s', resource, destPath);
    });
  }

  return { installPath, disableEsTmpDir };
}

/**
 * Appends single line to elasticsearch.yml config file
 */
async function appendToConfig(installPath: string, key: string, value: string) {
  fs.appendFileSync(path.resolve(installPath, ES_CONFIG), `${key}: ${value}\n`, 'utf8');
}

/**
 * Creates and configures Keystore
 */
async function configureKeystore(
  installPath: string,
  log: ToolingLog = defaultLog,
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
