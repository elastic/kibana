/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestType, TestStepInfo } from 'playwright/test';
import { scoutFixtures, lighthouseFixtures } from './single_thread_fixtures';
import { scoutParallelFixtures, globalSetup } from './parallel_run_fixtures';
import { getVrFor } from '../../fixtures/scope/test/visual_regression/store';

// Scout UI test fixtures: single-threaded
const wrapStep = <T extends TestType<any, any>>(t: T): T => {
  const originalStep = t.step.bind(t);

  const step = ((title: string, body: (stepInfo: TestStepInfo) => unknown, options?: unknown) => {
    return originalStep(
      title,
      async (stepInfo: TestStepInfo) => {
        try {
          // Allow body to receive the TestStepInfo as usual
          return await body(stepInfo);
        } finally {
          const info = t.info();
          const vr = getVrFor(info);
          await vr?.capture(title);
        }
      },
      options as any
    );
  }) as unknown as typeof t.step;

  // Preserve .skip semantics
  // @ts-ignore - type narrowing across assign is safe here
  step.skip = ((title: string, body: (stepInfo: TestStepInfo) => unknown, options?: unknown) => {
    return originalStep.skip(
      title,
      async (stepInfo: TestStepInfo) => {
        try {
          return await body(stepInfo);
        } finally {
          const info = t.info();
          const vr = getVrFor(info);
          await vr?.capture(title);
        }
      },
      options as any
    );
  }) as typeof t.step.skip;

  t.step = step;
  return t;
};

export const test = wrapStep(scoutFixtures);
// Scout UI test fixtures: single-threaded with Lighthouse
export const lighthouseTest = lighthouseFixtures;
// Scout core 'space aware' fixtures: parallel execution
export const spaceTest = wrapStep(scoutParallelFixtures);
// Scout global setup hook for parallel execution
export const globalSetupHook = globalSetup;

export type { ScoutTestFixtures, ScoutWorkerFixtures } from './single_thread_fixtures';
export type {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from './parallel_run_fixtures';
