/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SetupBuilds } from './breakages';
import { describeFix, lastFailures, looksFixed } from './recently_fixed';

const FIRST_BUILD_AT = Date.UTC(2026, 9, 1);
const HOUR_MS = 60 * 60 * 1000;

/** Builds an hour apart numbered from `first` on, oldest first: `x` failed, `.` passed. */
const setupBuilds = (
  pattern: string,
  { first = 1, branch = 'main', setup = 'a.config.ts' } = {}
): SetupBuilds => ({
  branch,
  setup,
  builds: [...pattern].map((outcome, index) => {
    const ranAt = new Date(FIRST_BUILD_AT + (first + index) * HOUR_MS);
    return {
      buildId: `build-${first + index}`,
      buildNumber: first + index,
      failed: outcome === 'x',
      ranAt,
      failedAt: outcome === 'x' ? ranAt : undefined,
    };
  }),
});

describe('lastFailures', () => {
  it('finds the last failure per branch across setups and counts the builds since once', () => {
    const setups = [
      setupBuilds('..x.....'),
      // the same builds in a second setup, one failing later
      setupBuilds('....x...', { setup: 'b.config.ts' }),
      setupBuilds('x..', { first: 100, branch: '9.6' }),
    ];

    expect(lastFailures(setups)).toEqual([
      { branch: 'main', at: new Date(FIRST_BUILD_AT + 5 * HOUR_MS), cleanBuilds: 3 },
      { branch: '9.6', at: new Date(FIRST_BUILD_AT + 100 * HOUR_MS), cleanBuilds: 2 },
    ]);
  });

  it('times a failure by the run that failed, which a retry can make later than the next builds', () => {
    const { builds, ...setup } = setupBuilds('x...');
    const [retried, ...later] = builds;
    const failedAt = new Date(FIRST_BUILD_AT + 3.5 * HOUR_MS);

    expect(lastFailures([{ ...setup, builds: [{ ...retried, failedAt }, ...later] }])).toEqual(
      // only build 4 ran after the retry
      [{ branch: 'main', at: failedAt, cleanBuilds: 1 }]
    );
  });

  it('leaves out branches without a failure', () => {
    const setups = [setupBuilds('.x..xxx..'), setupBuilds('...', { first: 100, branch: '9.6' })];

    expect(lastFailures(setups)).toEqual([
      { branch: 'main', at: new Date(FIRST_BUILD_AT + 7 * HOUR_MS), cleanBuilds: 2 },
    ]);
  });
});

describe('looksFixed', () => {
  const lastFailure = { branch: 'main', at: new Date(FIRST_BUILD_AT), cleanBuilds: 30 };

  it('needs a day since the last failure and enough builds to have missed 1.5 failures', () => {
    const aDayLater = new Date(FIRST_BUILD_AT + 24 * HOUR_MS);

    expect(looksFixed(lastFailure, 0.05, aDayLater)).toBe(true);
    expect(looksFixed(lastFailure, 0.045, aDayLater)).toBe(false);
    expect(looksFixed(lastFailure, 0.05, new Date(FIRST_BUILD_AT + 23 * HOUR_MS))).toBe(false);
  });
});

describe('describeFix', () => {
  it('names the clean builds, the branch and the day of the last failure', () => {
    expect(
      describeFix({ branch: '9.5', at: new Date('2026-10-20T15:00:00Z'), cleanBuilds: 73 })
    ).toBe('no failures in the 73 builds on 9.5 since 2026-10-20');
  });
});
