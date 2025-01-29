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
  createEsArchiver,
  createEsClient,
  createKbnClient,
  createLogger,
  createScoutConfig,
} from '../../common';
import { ScoutTestOptions } from '../types';
import { measurePerformance } from '../utils';

export async function ingestTestDataHook(config: FullConfig, archives: string[]) {
  const log = createLogger();

  if (archives.length === 0) {
    log.info('[scout setup] no test data to ingest');
    return;
  }

  return measurePerformance(log, '[scout setup]: ingestTestDataHook', async () => {
    // TODO: This should be configurable local vs cloud
    const configName = 'local';
    const projectUse = config.projects[0].use as ScoutTestOptions;
    const serversConfigDir = projectUse.serversConfigDir;
    const scoutConfig = createScoutConfig(serversConfigDir, configName, log);

    const esClient = createEsClient(scoutConfig, log);
    const kbnCLient = createKbnClient(scoutConfig, log);
    const esArchiver = createEsArchiver(esClient, kbnCLient, log);

    log.info('[scout setup] loading test data (only if indexes do not exist)...');
    for (const archive of archives) {
      await esArchiver.loadIfNeeded(archive);
    }
  });
}
