/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Config and utilities
export { createPlaywrightConfig } from './config';
export { createLazyPageObject } from './page_objects/utils';
export { expect } from './expect';

// Types for Playwright options
export type { ScoutPlaywrightOptions, ScoutTestOptions } from './types';

// Fixtures and Page Objects (can be extended with solution-specific logic)
export type {
  BrowserAuthFixture,
  ScoutPage,
  PageObjects, // can be extended with solution specific Page Objects
} from './fixtures/scope/test';
export { browserAuthFixture } from './fixtures/scope/test';

// Test and worker fixtures (can be extended with solution specific fixtures)
export type {
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from './test/ui';

// API services (can be extended with solution specific API services)
export type { ApiServicesFixture } from './fixtures/scope/worker/apis';

// Other worker types
export type { SamlAuth, SynthtraceFixture } from './fixtures/scope/worker';

// Tagging utility
export { tags } from './tags';

// Test entrypoints
export { test, spaceTest, lighthouseTest, globalSetupHook } from './test/ui';
export { apiTest } from './test/api';
