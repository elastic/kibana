/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type BuildRun, findConsistentFailure, verdictOf } from './rule';

const run = (build: number, overrides: Partial<BuildRun> = {}): BuildRun => ({
  build,
  lastAt: new Date('2026-10-16T10:00:00.000Z'),
  passed: 0,
  failed: 0,
  recovered: 0,
  skipped: 0,
  settled: false,
  ...overrides,
});

const passed = (build: number) => run(build, { passed: 1 });
/** Both the job and its retry reported a failure. */
const failed = (build: number) => run(build, { failed: 2, settled: true });
/** The job reported a failure, its retry has not reported yet. */
const pending = (build: number) => run(build, { failed: 1 });
/** Failed, then passed on a retry: in the run for Playwright, of the job for the rest. */
const recoveredInRun = (build: number) => run(build, { recovered: 1 });
const recoveredOnRetry = (build: number) => run(build, { failed: 1, passed: 1, settled: true });
const skipped = (build: number) => run(build, { skipped: 1 });

const passes = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => passed(from + index));

describe('verdictOf', () => {
  it('tells the five outcomes of a build apart', () => {
    expect(verdictOf(passed(1))).toBe('passed');
    expect(verdictOf(failed(1))).toBe('failed');
    expect(verdictOf(pending(1))).toBe('pending');
    expect(verdictOf(recoveredInRun(1))).toBe('recovered');
    expect(verdictOf(recoveredOnRetry(1))).toBe('recovered');
    expect(verdictOf(skipped(1))).toBe('skipped');
  });

  it('takes a single failed attempt as failed once the build is settled', () => {
    expect(verdictOf(run(1, { failed: 1, settled: true }))).toBe('failed');
  });
});

describe('findConsistentFailure', () => {
  it('finds a test that failed every attempt in the last two builds after a clean history', () => {
    const runs = [...passes(1, 20), failed(21), failed(22)];

    expect(findConsistentFailure(runs)).toEqual({
      failingBuilds: [failed(21), failed(22)],
      lastPassingBuild: passed(20),
    });
  });

  it('needs the consecutive failing builds the rule asks for', () => {
    expect(findConsistentFailure([...passes(1, 20), failed(21)])).toBeUndefined();
    expect(
      findConsistentFailure([...passes(1, 20), failed(21), failed(22)], {
        consecutiveBuilds: 3,
        cleanRunsBefore: 20,
      })
    ).toBeUndefined();
  });

  it('leaves a build not yet settled out of the picture', () => {
    const history = passes(1, 20);

    expect(findConsistentFailure([...history, failed(21), pending(22)])).toBeUndefined();
    expect(findConsistentFailure([...history, failed(21), failed(22), pending(23)])).toEqual({
      failingBuilds: [failed(21), failed(22)],
      lastPassingBuild: passed(20),
    });
  });

  it('counts a build whose retry never reported neither as a failure nor against the history', () => {
    const history = passes(1, 20);

    expect(findConsistentFailure([...history, pending(21), failed(22)])).toBeUndefined();
    expect(findConsistentFailure([...history, pending(21), failed(22), failed(23)])).toEqual({
      failingBuilds: [failed(22), failed(23)],
      lastPassingBuild: passed(20),
    });
    expect(findConsistentFailure([...history, failed(21), pending(22), failed(23)])).toEqual({
      failingBuilds: [failed(21), failed(23)],
      lastPassingBuild: passed(20),
    });
    expect(findConsistentFailure([...passes(1, 19), pending(20), failed(21), failed(22)])).toEqual({
      failingBuilds: [failed(21), failed(22)],
      lastPassingBuild: passed(19),
    });
  });

  it('keeps finding the failure while the break lasts', () => {
    const runs = [...passes(1, 20), ...Array.from({ length: 5 }, (_, index) => failed(21 + index))];

    expect(findConsistentFailure(runs)).toEqual({
      failingBuilds: runs.slice(20),
      lastPassingBuild: passed(20),
    });
  });

  it('is not fooled by a test that recovered on a retry', () => {
    const history = passes(1, 19);

    expect(
      findConsistentFailure([...history, recoveredInRun(20), failed(21), failed(22)])
    ).toBeUndefined();
    expect(
      findConsistentFailure([...history, recoveredOnRetry(20), failed(21), failed(22)])
    ).toBeUndefined();
    expect(
      findConsistentFailure([...history, passed(20), recoveredInRun(21), failed(22)])
    ).toBeUndefined();
  });

  it('only looks as far back as the rule asks', () => {
    const recent = [...passes(2, 20), failed(22), failed(23)];

    expect(findConsistentFailure([failed(1), ...recent])).toEqual({
      failingBuilds: [failed(22), failed(23)],
      lastPassingBuild: passed(21),
    });
    expect(findConsistentFailure([failed(1), ...recent.slice(1)])).toBeUndefined();
  });

  it('accepts a shorter clean history than asked, as a new test has', () => {
    expect(findConsistentFailure([passed(1), failed(2), failed(3)])).toEqual({
      failingBuilds: [failed(2), failed(3)],
      lastPassingBuild: passed(1),
    });
    expect(findConsistentFailure([failed(1), failed(2)])).toEqual({
      failingBuilds: [failed(1), failed(2)],
      lastPassingBuild: undefined,
    });
  });

  it('does not count skipped builds as runs, but a skip after the failures as dealt with', () => {
    // the failure is 20 runs back only because the skip does not count
    expect(
      findConsistentFailure([failed(1), ...passes(2, 19), skipped(21), failed(22), failed(23)])
    ).toBeUndefined();
    expect(findConsistentFailure([...passes(1, 20), skipped(21), failed(22), failed(23)])).toEqual({
      failingBuilds: [failed(22), failed(23)],
      lastPassingBuild: passed(20),
    });
    expect(
      findConsistentFailure([...passes(1, 20), failed(21), failed(22), skipped(23)])
    ).toBeUndefined();
  });

  it('ignores the history when asked for no clean runs, still naming the last pass', () => {
    const rule = { consecutiveBuilds: 2, cleanRunsBefore: 0 };

    expect(
      findConsistentFailure([passed(1), failed(2), passed(3), failed(4), failed(5)], rule)
    ).toEqual({
      failingBuilds: [failed(4), failed(5)],
      lastPassingBuild: passed(3),
    });
  });

  it('orders the runs by build', () => {
    expect(findConsistentFailure([failed(22), ...passes(1, 20), failed(21)])).toEqual({
      failingBuilds: [failed(21), failed(22)],
      lastPassingBuild: passed(20),
    });
  });

  it('finds nothing in no runs', () => {
    expect(findConsistentFailure([])).toBeUndefined();
  });
});
