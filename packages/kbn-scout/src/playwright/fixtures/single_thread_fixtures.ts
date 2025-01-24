/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeTests } from 'playwright/test';
import { coreWorkerFixtures, esArchiverFixture, uiSettingsFixture } from './worker';
import type {
  EsArchiverFixture,
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutTestConfig,
  UiSettingsFixture,
} from './worker';
import {
  scoutPageFixture,
  browserAuthFixture,
  pageObjectsFixture,
  validateTagsFixture,
  BrowserAuthFixture,
  ScoutPage,
  PageObjects,
} from './test';
export type { PageObjects, ScoutPage } from './test';

export const scoutFixtures = mergeTests(
  // worker scope fixtures
  coreWorkerFixtures,
  esArchiverFixture,
  uiSettingsFixture,
  // test scope fixtures
  browserAuthFixture,
  scoutPageFixture,
  pageObjectsFixture,
  validateTagsFixture
);

export interface ScoutTestFixtures {
  browserAuth: BrowserAuthFixture;
  page: ScoutPage;
  pageObjects: PageObjects;
}

export interface ScoutWorkerFixtures {
  log: ScoutLogger;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  kbnClient: KbnClient;
  esClient: EsClient;
  esArchiver: EsArchiverFixture;
  uiSettings: UiSettingsFixture;
}
