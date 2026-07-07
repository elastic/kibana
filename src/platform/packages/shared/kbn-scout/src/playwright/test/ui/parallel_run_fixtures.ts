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
} from '../../fixtures/scope/worker';
import type {
  ApiServicesFixture,
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
  isSnapshotBuild: boolean;
}

export const globalSetupFixtures = mergeTests(
  coreWorkerFixtures,
  esArchiverFixture,
  apiServicesFixture
);

/**
 * Fixtures available in the global teardown hook (`global.teardown.ts`).
 *
 * Intentionally narrower than `globalSetupFixtures`: `esArchiver` is omitted on
 * purpose. Scout's `esArchiver` fixture only exposes `loadIfNeeded` (see
 * `fixtures/scope/worker/es_archiver.ts`) — archive-driven unloading is not
 * supported by design, because deleting indexes that way is slow and offers
 * no real benefit (leftover indexes in the cluster don't affect test outcomes
 * once setup is idempotent). For state that *does* need to be reset across
 * configs sharing the cluster (e.g. server-wide feature-flag overrides,
 * legacy/hand-indexed data), teardown should use direct primitives:
 *   - `esClient.indices.delete` / `deleteByQuery` / `indices.deleteDataStream`
 *   - `kbnClient.savedObjects.*` and `kbnClient.uiSettings.{unset,update,updateGlobal}`
 *   - `apiServices.*` (e.g. `apiServices.core.settings(...)` to revert feature flags)
 *
 * This is also consistent with the `scout_no_es_archiver_in_parallel_tests`
 * ESLint rule, which only allows `esArchiver` in `global.setup.ts`.
 */
export const globalTeardownFixtures = mergeTests(coreWorkerFixtures, apiServicesFixture);
