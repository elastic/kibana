/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// CLI tools
export * as cli from './src/cli';

// Test framework
export {
  expect,
  test,
  spaceTest,
  lighthouseTest,
  apiTest,
  globalSetupHook,
  tags,
} from './src/playwright';

// Fixtures & configuration
export {
  browserAuthFixture,
  apiServicesFixture,
  synthtraceFixture,
  createPlaywrightConfig,
  createLazyPageObject,
} from './src/playwright';

// Playwright integration
export { mergeTests, test as playwrightTest } from 'playwright/test';

// Performance monitoring
export { measurePerformance, measurePerformanceAsync } from './src/common';

// EUI components
export * from './src/playwright/eui_components';

// Scout core types
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

// Fixture types
export type {
  ApiServicesFixture,
  BrowserAuthFixture,
  SamlAuth,
  SynthtraceFixture,
} from './src/playwright';

// Service & configuration types
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

// Authentication types
export type { RoleApiCredentials } from './src/playwright/fixtures/scope/worker/api_key';

// Re-exported Playwright types
export type { Locator, CDPSession } from 'playwright/test';
