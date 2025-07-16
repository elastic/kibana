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
  uiSettingsFixture,
  synthtraceFixture,
  lighthouseFixture,
} from './worker';
import type {
  ApiServicesFixture,
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
  persistentContext,
  perfTrackerFixture,
} from './test';
import type { BrowserAuthFixture, ScoutPage, PageObjects, PerfTrackerFixture } from './test';
export type { ScoutPage, PageObjects, BrowserAuthFixture } from './test';
export type { ApiServicesFixture, LighthouseAuditOptions } from './worker';

export const scoutFixtures = mergeTests(
  // worker scope fixtures
  coreWorkerFixtures,
  esArchiverFixture,
  uiSettingsFixture,
  synthtraceFixture,
  // api fixtures
  apiServicesFixture,
  // test scope fixtures
  browserAuthFixture,
  scoutPageFixture,
  pageObjectsFixture,
  validateTagsFixture,
  // performance fixtures
  perfTrackerFixture
);

export interface ScoutTestFixtures {
  browserAuth: BrowserAuthFixture;
  page: ScoutPage;
  pageObjects: PageObjects;
  perfTracker: PerfTrackerFixture;
}

export interface ScoutWorkerFixtures extends ApiServicesFixture {
  log: ScoutLogger;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  kbnClient: KbnClient;
  esClient: EsClient;
  esArchiver: EsArchiverFixture;
  uiSettings: UiSettingsFixture;
  apiServices: ApiServicesFixture;
  apmSynthtraceEsClient: SynthtraceFixture['apmSynthtraceEsClient'];
  infraSynthtraceEsClient: SynthtraceFixture['infraSynthtraceEsClient'];
}

export const lighthouseFixtures = mergeTests(scoutFixtures, persistentContext, lighthouseFixture);
