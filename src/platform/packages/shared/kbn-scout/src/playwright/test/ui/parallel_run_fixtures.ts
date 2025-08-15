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
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutSpaceParallelFixture,
  ScoutTestConfig,
} from '../../fixtures/scope/worker';
import {
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

export const globalSetup = mergeTests(
  coreWorkerFixtures,
  esArchiverFixture,
  synthtraceFixture,
  apiServicesFixture
);
