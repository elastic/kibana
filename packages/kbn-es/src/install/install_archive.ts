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
import del from 'del';
import { extract } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';

import { BASE_PATH, ES_CONFIG } from '../paths';
import { Artifact } from '../artifact';
import { parseSettings, SettingsFilter } from '../settings';
import { log as defaultLog } from '../utils/log';
import { configureKeystore, createKeystore, ElasticsearchAPMSettings } from '../utils';

interface InstallArchiveOptions {
  license?: string;
  password?: string;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  esArgs?: string[];
  apmSettings?: ElasticsearchAPMSettings;
}

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
export async function installArchive(archive: string, options: InstallArchiveOptions = {}) {
  const {
    license = 'basic',
    password = 'changeme',
    basePath = BASE_PATH,
    installPath = path.resolve(basePath, path.basename(archive, '.tar.gz')),
    log = defaultLog,
    esArgs = [],
    apmSettings = undefined,
  } = options;

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

  const tmpdir = path.resolve(installPath, 'ES_TMPDIR');
  fs.mkdirSync(tmpdir, { recursive: true });
  log.info('created %s', chalk.bold(tmpdir));

  if (license !== 'oss') {
    // starting in 6.3, security is disabled by default. Since we bootstrap
    // the keystore, we can enable security ourselves.
    await appendToConfig(installPath, 'xpack.security.enabled', 'true');
    await appendToConfig(installPath, 'xpack.license.self_generated.type', license);

    // Configure Elasticsearch APM
    const apmKeystore: Array<[string, string]> = [];
    if (apmSettings) {
      apmKeystore.push(['tracing.apm.secret_token', apmSettings.apmSecretToken]);
      await appendToConfig(installPath, 'tracing.apm.enabled', 'true');
      await appendToConfig(installPath, 'tracing.apm.agent.transaction_sample_rate', '1.0');
      await appendToConfig(installPath, 'tracing.apm.agent.server_url', apmSettings.apmServerUrl);
    }
    await createKeystore(installPath);
    await configureKeystore(installPath, log, [
      ['bootstrap.password', password],
      ...apmKeystore,
      ...parseSettings(esArgs, { filter: SettingsFilter.SecureOnly }),
    ]);
  }

  return { installPath };
}

/**
 * Appends single line to elasticsearch.yml config file
 */
async function appendToConfig(installPath: string, key: string, value: string) {
  fs.appendFileSync(path.resolve(installPath, ES_CONFIG), `${key}: ${value}\n`, 'utf8');
}
