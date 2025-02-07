/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { test, spaceTest } from './src/playwright';
export type {
  ObltPageObjects,
  ObltTestFixtures,
  ObltWorkerFixtures,
  ObltParallelTestFixtures,
  ObltParallelWorkerFixtures,
} from './src/playwright';

// re-export from @kbn/scout
export {
  expect,
  tags,
  createPlaywrightConfig,
  createLazyPageObject,
  ingestTestDataHook,
} from '@kbn/scout';

export type {
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutPage,
  PageObjects,
  ScoutServerConfig,
  ScoutTestConfig,
  ScoutPlaywrightOptions,
  ScoutTestOptions,
  Locator,
} from '@kbn/scout';
