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
  tags,
  createPlaywrightConfig,
  createLazyPageObject,
  ingestTestDataHook,
  ingestSynthtraceDataHook,
} from './src/playwright';
export type {
  ScoutPlaywrightOptions,
  ScoutTestOptions,
  ScoutPage,
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from './src/playwright';

export type {
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutServerConfig,
  ScoutTestConfig,
} from './src/types';

// re-export from Playwright
export type { Locator } from 'playwright/test';

export { measurePerformance, measurePerformanceAsync } from './src/common';
