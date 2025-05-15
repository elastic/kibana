/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import chalk from 'chalk';

import { BASE_PATH } from '../paths';
import { installArchive } from './install_archive';
import { log as defaultLog } from '../utils/log';
import { Artifact } from '../artifact';
import { DownloadSnapshotOptions, InstallSnapshotOptions } from './types';

/**
 * Download an ES snapshot
 */
export async function downloadSnapshot({
  license = 'basic',
  version,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, version),
  log = defaultLog,
  useCached = false,
}: DownloadSnapshotOptions) {
  log.info('version: %s', chalk.bold(version));
  log.info('install path: %s', chalk.bold(installPath));
  log.info('license: %s', chalk.bold(license));

  const artifact = await Artifact.getSnapshot(license, version, log);
  const dest = path.resolve(basePath, 'cache', artifact.spec.filename);
  await artifact.download(dest, { useCached });

  return {
    downloadPath: dest,
  };
}

/**
 * Installs ES from snapshot
 */
export async function installSnapshot({
  license = 'basic',
  password = 'password',
  version,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, version),
  log = defaultLog,
  esArgs,
  useCached = false,
  resources,
}: InstallSnapshotOptions) {
  const { downloadPath } = await downloadSnapshot({
    license,
    version,
    basePath,
    installPath,
    log,
    useCached,
  });

  return await installArchive(downloadPath, {
    license,
    password,
    basePath,
    installPath,
    log,
    esArgs,
    resources,
  });
}
