/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakyTestBranchStats } from '@kbn/scout-reporting';
import { isSkippedTest, skippedBranches } from './skipped';
import { flakyTest } from './test_fixtures';

const branch = (
  name: string,
  skipped: boolean | undefined,
  overrides: Partial<FlakyTestBranchStats> = {}
): FlakyTestBranchStats => ({
  branch: name,
  builds: 100,
  failedBuilds: 5,
  buildFailRate: 0.05,
  skipped,
  ...overrides,
});

describe('isSkippedTest', () => {
  it('is skipped when every setup skips it on the only branch it failed on', () => {
    const test = flakyTest({ byBranch: [branch('main', true)] });

    expect(isSkippedTest(test)).toBe(true);
    expect(skippedBranches(test)).toEqual(['main']);
  });

  it('is not skipped while it still runs on another branch it failed on', () => {
    expect(
      isSkippedTest(flakyTest({ byBranch: [branch('main', true), branch('9.5', false)] }))
    ).toBe(false);
  });

  it('only looks at the branches it failed on, pull requests left out', () => {
    const test = flakyTest({
      byBranch: [
        branch('main', true),
        branch('someone:fix-it', false),
        branch('9.4', false, { failedBuilds: 0 }),
      ],
    });

    expect(isSkippedTest(test)).toBe(true);
    expect(skippedBranches(test)).toEqual(['main']);
  });

  it('is not skipped when it only failed on pull requests, or the report does not say', () => {
    expect(isSkippedTest(flakyTest({ byBranch: [branch('someone:fix-it', true)] }))).toBe(false);
    expect(isSkippedTest(flakyTest({ byBranch: [branch('main', undefined)] }))).toBe(false);
  });
});
