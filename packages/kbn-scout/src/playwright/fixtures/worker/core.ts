/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';

import { LoadActionPerfOptions } from '@kbn/es-archiver';
import {
  createKbnUrl,
  createEsArchiver,
  createEsClient,
  createKbnClient,
  createLogger,
  createSamlSessionManager,
  createScoutConfig,
} from '../../../common/services';
import { ScoutWorkerFixtures } from '../types/worker_scope';
import { ScoutTestOptions } from '../../types';

export const coreWorkerFixtures = base.extend<{}, ScoutWorkerFixtures>({
  log: [
    ({}, use) => {
      use(createLogger());
    },
    { scope: 'worker' },
  ],

  config: [
    ({ log }, use, testInfo) => {
      const configName = 'local';
      const projectUse = testInfo.project.use as ScoutTestOptions;
      const serversConfigDir = projectUse.serversConfigDir;
      const configInstance = createScoutConfig(serversConfigDir, configName, log);

      use(configInstance);
    },
    { scope: 'worker' },
  ],

  kbnUrl: [
    ({ config, log }, use) => {
      use(createKbnUrl(config, log));
    },
    { scope: 'worker' },
  ],

  esClient: [
    ({ config, log }, use) => {
      use(createEsClient(config, log));
    },
    { scope: 'worker' },
  ],

  kbnClient: [
    ({ log, config }, use) => {
      use(createKbnClient(config, log));
    },
    { scope: 'worker' },
  ],

  esArchiver: [
    ({ log, esClient, kbnClient }, use) => {
      const esArchiverInstance = createEsArchiver(esClient, kbnClient, log);
      // to speedup test execution we only allow to ingest the data indexes and only if index doesn't exist
      const loadIfNeeded = async (name: string, performance?: LoadActionPerfOptions | undefined) =>
        esArchiverInstance!.loadIfNeeded(name, performance);

      use({ loadIfNeeded });
    },
    { scope: 'worker' },
  ],

  samlAuth: [
    ({ log, config }, use) => {
      use(createSamlSessionManager(config, log));
    },
    { scope: 'worker' },
  ],
});
