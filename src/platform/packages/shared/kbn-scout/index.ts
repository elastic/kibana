/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * as cli from './src/cli';
export {
  expect,
  test,
  spaceTest,
  lighthouseTest,
  globalSetupHook,
  tags,
  browserAuthFixture,
  createPlaywrightConfig,
  createLazyPageObject,
} from './src/playwright';
export type {
  ScoutPlaywrightOptions,
  ScoutTestOptions,
  ScoutPage,
  PageObjects,
  ApiServicesFixture,
  BrowserAuthFixture,
  SamlAuth,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  SynthtraceFixture,
} from './src/playwright';

export type {
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutServerConfig,
  ScoutTestConfig,
  KibanaRole,
  ElasticsearchRoleDescriptor,
} from './src/types';

// re-export from Playwright
export type { Locator, CDPSession } from 'playwright/test';
export { mergeTests, test as playwrightTest } from 'playwright/test';

export { measurePerformance, measurePerformanceAsync } from './src/common';
