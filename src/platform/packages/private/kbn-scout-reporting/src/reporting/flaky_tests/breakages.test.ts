/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  branchCountsWithout,
  chanceOfFailingInARow,
  describeBreakage,
  findBreakages,
  type SetupBuilds,
} from './breakages';

const SETUP = 'kibana-on-merge a.config.ts stateful-classic local';

/** Builds run an hour apart, build 0 on Oct 1, 2026. */
const FIRST_BUILD_AT = Date.UTC(2026, 9, 1);
const HOUR_MS = 60 * 60 * 1000;

/** Builds numbered from `first` on, oldest first: `x` failed, `.` passed. */
const setupBuilds = (pattern: string, first = 1, branch = 'main'): SetupBuilds => ({
  branch,
  setup: SETUP,
  builds: [...pattern].map((outcome, index) => ({
    buildId: `build-${first + index}`,
    buildNumber: first + index,
    failed: outcome === 'x',
    ranAt: new Date(FIRST_BUILD_AT + (first + index) * HOUR_MS),
  })),
});

const numbers = (setup: SetupBuilds) => setup.builds.map(({ buildNumber }) => buildNumber);

describe('chanceOfFailingInARow', () => {
  it('sums the chance of the run over the first build and every passing build', () => {
    // 10 of 100 builds failed: 91 starting points, each 0.1^length
    expect(chanceOfFailingInARow(100, 0.1, 3)).toBeCloseTo(0.091);
    expect(chanceOfFailingInARow(100, 0.1, 4)).toBeCloseTo(0.0091);
  });

  it('is at most 1', () => {
    expect(chanceOfFailingInARow(100, 0.5, 3)).toBe(1);
  });
});

describe('findBreakages', () => {
  it('finds a breakage up to the newest build as ongoing', () => {
    const setup = setupBuilds(`${'.'.repeat(60)}${'x'.repeat(40)}`);

    const [breakage, ...others] = findBreakages(setup);

    expect(others).toEqual([]);
    expect(breakage).toMatchObject({ branch: 'main', setup: SETUP, ongoing: true });
    expect(numbers(breakage)).toEqual(numbers(setup).slice(60));
  });

  it('finds a breakage that was fixed, apart from the failures around it', () => {
    const pattern = `.x${'.'.repeat(50)}${'x'.repeat(12)}${'.'.repeat(30)}x....`;

    const breakages = findBreakages(setupBuilds(pattern));

    expect(breakages).toHaveLength(1);
    expect(breakages[0].ongoing).toBe(false);
    expect(numbers(breakages[0])).toEqual(Array.from({ length: 12 }, (_, index) => 53 + index));
  });

  it('finds none in failures scattered at random, even a few in a row', () => {
    // 8 of 100 failed, 3 of them in a row: a 5% chance at that rate
    const pattern = `${'.'.repeat(20)}xxx${'.'.repeat(20)}x.x${'.'.repeat(20)}x.x.x.${'.'.repeat(
      28
    )}`;

    expect(findBreakages(setupBuilds(pattern))).toEqual([]);
  });

  it('needs a few failed builds in a row, even from a test that failed every build', () => {
    expect(findBreakages(setupBuilds('xx'))).toEqual([]);
    expect(findBreakages(setupBuilds('xxx'))).toEqual([expect.objectContaining({ ongoing: true })]);
  });

  it('finds none without builds', () => {
    expect(findBreakages(setupBuilds(''))).toEqual([]);
  });
});

describe('branchCountsWithout', () => {
  const counts = [
    { branch: 'main', builds: 53, failedBuilds: 12 },
    { branch: '9.5', builds: 20, failedBuilds: 2 },
  ];

  it('takes the builds of every breakage off both counts of its branch', () => {
    const breakages = findBreakages(
      setupBuilds(`${'.'.repeat(20)}${'x'.repeat(10)}${'.'.repeat(20)}x.x`)
    );

    expect(breakages).toHaveLength(1);
    expect(branchCountsWithout(counts, breakages)).toEqual([
      { branch: 'main', builds: 43, failedBuilds: 2 },
      { branch: '9.5', builds: 20, failedBuilds: 2 },
    ]);
    expect(branchCountsWithout(counts, [])).toEqual(counts);
  });

  it('takes a build off once when it broke in several setups', () => {
    const pattern = `${'.'.repeat(20)}${'x'.repeat(10)}${'.'.repeat(20)}x.x`;
    const breakages = [
      setupBuilds(pattern),
      { ...setupBuilds(pattern), setup: 'kibana-on-merge b.config.ts serverless local' },
    ].flatMap(findBreakages);

    expect(breakages).toHaveLength(2);
    expect(branchCountsWithout(counts, breakages)[0]).toEqual({
      branch: 'main',
      builds: 43,
      failedBuilds: 2,
    });
  });

  it('takes a breakage in a pipeline judged on its own off that pipeline’s counts only', () => {
    const fipsCounts = [
      ...counts,
      { branch: 'main', pipeline: 'kibana-fips', builds: 40, failedBuilds: 8 },
    ];
    const breakages = findBreakages({
      ...setupBuilds(`${'.'.repeat(30)}xxxxxx`),
      pipeline: 'kibana-fips',
      setup: 'kibana-fips a.config.ts stateful-classic local',
    });

    expect(breakages).toEqual([expect.objectContaining({ pipeline: 'kibana-fips' })]);
    expect(branchCountsWithout(fipsCounts, breakages)).toEqual([
      { branch: 'main', builds: 53, failedBuilds: 12 },
      { branch: '9.5', builds: 20, failedBuilds: 2 },
      { branch: 'main', pipeline: 'kibana-fips', builds: 34, failedBuilds: 2 },
    ]);
  });
});

describe('describeBreakage', () => {
  it('names the run, its branch, its first and last builds and its setup', () => {
    const [breakage] = findBreakages(setupBuilds(`${'.'.repeat(50)}xxxxx`, 113400));

    expect(describeBreakage(breakage)).toBe(
      `5 failed builds in a row on main (#113450 to #113454) in ${SETUP}`
    );
  });
});
