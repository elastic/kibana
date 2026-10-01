/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakyTestBranchStats } from '@kbn/scout-reporting';
import { isSkippedTest, MIN_TIME_SINCE_EXECUTION_MS, skippedBranches } from './skipped';
import { flakyTest } from './test_fixtures';

const LAST_EXECUTED_AT = new Date('2026-09-07T10:00:00.000Z');

const branch = (
  name: string,
  status: string,
  at: Date,
  overrides: Partial<FlakyTestBranchStats> = {}
): FlakyTestBranchStats => ({
  branch: name,
  builds: 100,
  failedBuilds: 5,
  buildFailRate: 0.05,
  latestExecutionAt: LAST_EXECUTED_AT,
  latestRun: { status, timestamp: at },
  ...overrides,
});

const SKIPPED_DAYS_LATER = new Date('2026-09-09T06:00:00.000Z');

describe('isSkippedTest', () => {
  it('is skipped when its latest run on the only branch it failed on was a skip, long after it last ran', () => {
    const test = flakyTest({ byBranch: [branch('main', 'skipped', SKIPPED_DAYS_LATER)] });

    expect(isSkippedTest(test)).toBe(true);
    expect(skippedBranches(test)).toEqual(['main']);
  });

  it('is not skipped while it still runs on another branch it failed on', () => {
    const test = flakyTest({
      byBranch: [
        branch('main', 'skipped', SKIPPED_DAYS_LATER),
        branch('9.5', 'failed', SKIPPED_DAYS_LATER),
      ],
    });

    expect(isSkippedTest(test)).toBe(false);
  });

  it('is not skipped when the skip came minutes after an execution, as when a target skips it conditionally', () => {
    const minutesLater = new Date(LAST_EXECUTED_AT.getTime() + 10 * 60 * 1000);
    const atThreshold = new Date(LAST_EXECUTED_AT.getTime() + MIN_TIME_SINCE_EXECUTION_MS);

    expect(isSkippedTest(flakyTest({ byBranch: [branch('main', 'skipped', minutesLater)] }))).toBe(
      false
    );
    expect(isSkippedTest(flakyTest({ byBranch: [branch('main', 'skipped', atThreshold)] }))).toBe(
      true
    );
  });

  it('only looks at the branches it failed on, pull requests left out', () => {
    const test = flakyTest({
      byBranch: [
        branch('main', 'skipped', SKIPPED_DAYS_LATER),
        branch('someone:fix-it', 'failed', SKIPPED_DAYS_LATER),
        branch('9.4', 'passed', SKIPPED_DAYS_LATER, { failedBuilds: 0 }),
      ],
    });

    expect(isSkippedTest(test)).toBe(true);
    expect(skippedBranches(test)).toEqual(['main']);
  });

  it('is not skipped when it only failed on pull requests, or its latest run is unknown', () => {
    expect(
      isSkippedTest(
        flakyTest({ byBranch: [branch('someone:fix-it', 'skipped', SKIPPED_DAYS_LATER)] })
      )
    ).toBe(false);
    expect(
      isSkippedTest(
        flakyTest({
          byBranch: [branch('main', 'skipped', SKIPPED_DAYS_LATER, { latestRun: undefined })],
        })
      )
    ).toBe(false);
  });
});
