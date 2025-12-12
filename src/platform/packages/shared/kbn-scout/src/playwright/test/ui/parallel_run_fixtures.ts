/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeTests } from 'playwright/test';
import {
  apiServicesFixture,
  coreWorkerFixtures,
  esArchiverFixture,
  scoutSpaceParallelFixture,
  synthtraceFixture,
} from '../../fixtures/scope/worker';
import type {
  ApiServicesFixture,
  CoreWorkerFixtures,
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutSpaceParallelFixture,
  ScoutTestConfig,
} from '../../fixtures/scope/worker';
import {
  pageContextFixture,
  scoutPageParallelFixture,
  browserAuthFixture,
  pageObjectsParallelFixture,
  validateTagsFixture,
} from '../../fixtures/scope/test';
import type { BrowserAuthFixture, ScoutPage, PageObjects } from '../../fixtures/scope/test';

export const scoutParallelFixtures = mergeTests(
  // worker scope fixtures
  coreWorkerFixtures,
  scoutSpaceParallelFixture,
  apiServicesFixture,
  // test scope fixtures
  pageContextFixture,
  browserAuthFixture,
  scoutPageParallelFixture,
  pageObjectsParallelFixture,
  validateTagsFixture
);

export interface ScoutParallelTestFixtures {
  browserAuth: BrowserAuthFixture;
  page: ScoutPage;
  pageObjects: PageObjects;
}

export interface ScoutParallelWorkerFixtures {
  log: ScoutLogger;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  kbnClient: KbnClient;
  esClient: EsClient;
  scoutSpace: ScoutSpaceParallelFixture;
  apiServices: ApiServicesFixture;
}

/**
 * Pre-creates Elasticsearch Security indexes (.security-tokens, .security-profile)
 * during global setup to prevent race conditions when parallel tests perform their first SAML authentication.
 */
const preCreateSecurityIndexesFixture = coreWorkerFixtures.extend<
  {},
  { samlAuth: CoreWorkerFixtures['samlAuth']; preCreateSecurityIndexes: void }
>({
  preCreateSecurityIndexes: [
    async (
      {
        samlAuth,
        log,
      }: { samlAuth: CoreWorkerFixtures['samlAuth']; log: CoreWorkerFixtures['log'] },
      use: (arg: void) => Promise<void>
    ) => {
      log.debug('Running SAML authentication to pre-create Elasticsearch .security indexes');
      await samlAuth.session.getInteractiveUserSessionCookieWithRoleScope('admin');
      await use();
    },
    { scope: 'worker', auto: true },
  ],
});

export const globalSetupFixtures = mergeTests(
  coreWorkerFixtures,
  esArchiverFixture,
  synthtraceFixture,
  apiServicesFixture,
  preCreateSecurityIndexesFixture
);
