/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FullConfig } from 'playwright/test';
import {
  getLogger,
  getEsArchiver,
  createScoutConfig,
  measurePerformanceAsync,
  getEsClient,
  getKbnClient,
} from '../../common';
import { ScoutTestOptions } from '../types';

export async function ingestTestDataHook(config: FullConfig, archives: string[]) {
  const log = getLogger();

  if (archives.length === 0) {
    log.debug('[setup] no test data to ingest');
    return;
  }

  return measurePerformanceAsync(log, '[setup]: ingestTestDataHook', async () => {
    // TODO: This should be configurable local vs cloud
    const configName = 'local';
    const projectUse = config.projects[0].use as ScoutTestOptions;
    const serversConfigDir = projectUse.serversConfigDir;
    const scoutConfig = createScoutConfig(serversConfigDir, configName, log);
    const esClient = getEsClient(scoutConfig, log);
    const kbnClient = getKbnClient(scoutConfig, log);
    const esArchiver = getEsArchiver(esClient, kbnClient, log);

    log.debug('[setup] loading test data (only if indexes do not exist)...');
    for (const archive of archives) {
      await esArchiver.loadIfNeeded(archive);
    }
  });
}
