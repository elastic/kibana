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
  ApiFixtures,
  apiFixtures,
  coreWorkerFixtures,
  esArchiverFixture,
  uiSettingsFixture,
  synthtraceFixture,
} from './worker';
import type {
  EsArchiverFixture,
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutTestConfig,
  UiSettingsFixture,
  SynthtraceFixture,
} from './worker';
import {
  scoutPageFixture,
  browserAuthFixture,
  pageObjectsFixture,
  validateTagsFixture,
} from './test';
import type { BrowserAuthFixture, ScoutPage, PageObjects } from './test';
export type { ScoutPage, PageObjects } from './test';

export const scoutFixtures = mergeTests(
  // worker scope fixtures
  coreWorkerFixtures,
  esArchiverFixture,
  uiSettingsFixture,
  synthtraceFixture,
  // api fixtures
  apiFixtures,
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

export interface ScoutWorkerFixtures extends ApiFixtures {
  log: ScoutLogger;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  kbnClient: KbnClient;
  esClient: EsClient;
  esArchiver: EsArchiverFixture;
  uiSettings: UiSettingsFixture;
  apmSynthtraceEsClient: SynthtraceFixture['apmSynthtraceEsClient'];
  infraSynthtraceEsClient: SynthtraceFixture['infraSynthtraceEsClient'];
  otelSynthtraceEsClient: SynthtraceFixture['otelSynthtraceEsClient'];
}
