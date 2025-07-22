/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scoutFixtures, scoutParallelFixtures, lighthouseFixtures, globalSetup } from './fixtures';

// Scout core fixtures: worker & test scope
export const test = scoutFixtures;

export const lighthouseTest = lighthouseFixtures;

// Scout core 'space aware' fixtures: worker & test scope
export const spaceTest = scoutParallelFixtures;

export const globalSetupHook = globalSetup;

export { createPlaywrightConfig } from './config';
export { createLazyPageObject } from './page_objects/utils';
export { expect } from './expect';

export type { ScoutPlaywrightOptions, ScoutTestOptions } from './types';
export type {
  BrowserAuthFixture,
  ScoutPage,
  // can be extended with solution specific fixtures
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  // can be extended with solution specific API services
  ApiServicesFixture,
  // can be extended with solution specific Page Objects
  PageObjects,
} from './fixtures';

// can be extended with solution specific logic
export { browserAuthFixture } from './fixtures/test';

export type { SamlAuth, SynthtraceFixture } from './fixtures/worker';

// use to tag tests
export { tags } from './tags';
