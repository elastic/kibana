/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scoutFixtures, lighthouseFixtures } from './single_thread_fixtures';
import { scoutParallelFixtures, globalSetup } from './parallel_run_fixtures';

// Scout UI test fixtures: single-threaded
export const test = scoutFixtures;
// Scout UI test fixtures: single-threaded with Lighthouse
export const lighthouseTest = lighthouseFixtures;
// Scout core 'space aware' fixtures: parallel execution
export const spaceTest = scoutParallelFixtures;
// Scout global setup hook for parallel execution
export const globalSetupHook = globalSetup;

export type { ScoutTestFixtures, ScoutWorkerFixtures } from './single_thread_fixtures';
export type {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from './parallel_run_fixtures';
