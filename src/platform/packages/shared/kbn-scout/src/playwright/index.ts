/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scoutFixtures, scoutParallelFixtures } from './fixtures';

// Scout core fixtures: worker & test scope
export const test = scoutFixtures;

// Scout core 'space aware' fixtures: worker & test scope
export const spaceTest = scoutParallelFixtures;

export { createPlaywrightConfig } from './config';
export { createLazyPageObject } from './page_objects/utils';
export { expect } from './expect';

export type { ScoutPlaywrightOptions, ScoutTestOptions } from './types';
export type {
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutPage,
  PageObjects,
} from './fixtures';

// use to tag tests
export { tags } from './tags';

export { ingestTestDataHook, ingestSynthtraceDataHook } from './global_hooks';
