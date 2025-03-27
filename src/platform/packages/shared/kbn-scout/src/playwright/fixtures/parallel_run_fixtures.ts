/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeTests } from 'playwright/test';
import { coreWorkerFixtures, scoutSpaceParallelFixture } from './worker';
import type {
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutSpaceParallelFixture,
  ScoutTestConfig,
} from './worker';
import {
  scoutPageParallelFixture,
  browserAuthParallelFixture,
  pageObjectsParallelFixture,
  validateTagsFixture,
} from './test';
import type { BrowserAuthFixture, ScoutPage, PageObjects } from './test';

export const scoutParallelFixtures = mergeTests(
  // worker scope fixtures
  coreWorkerFixtures,
  scoutSpaceParallelFixture,
  // test scope fixtures
  browserAuthParallelFixture,
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
}
