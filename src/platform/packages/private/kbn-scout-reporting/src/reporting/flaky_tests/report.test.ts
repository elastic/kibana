/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ToolingLog } from '@kbn/tooling-log';
import type { SetupBuilds } from './breakages';
import {
  checkFlakyTest,
  classifyTest,
  flakiestQualifyingBranch,
  latestRunAcrossBranches,
  mayQualify,
  rankTests,
  ScoutFlakyTests,
} from './report';
import {
  DEFAULT_FLAKY_TEST_REPORT_OPTIONS,
  FlakyTestReportSchema,
  type FlakyTestBranchStats,
} from './schema';
import * as queries from './queries';

const thresholds = { minBuilds: 10, minFailedBuilds: 2, minFailRate: 0 };

describe('DEFAULT_FLAKY_TEST_REPORT_OPTIONS', () => {
  it('requires a 3% build failure rate on a branch by default', () => {
    expect(DEFAULT_FLAKY_TEST_REPORT_OPTIONS.thresholds.minFailRate).toBe(0.03);
  });
});

describe('mayQualify', () => {
  it('needs enough builds and failed builds in total, ignoring the failure rate', () => {
    expect(mayQualify({ builds: 9, failedBuilds: 5 }, thresholds)).toBe(false);
    expect(mayQualify({ builds: 50, failedBuilds: 1 }, thresholds)).toBe(false);
    expect(mayQualify({ builds: 10, failedBuilds: 2 }, thresholds)).toBe(true);
    // a 0.4% total may still hide a branch above any rate threshold
    const strict = { ...thresholds, minFailRate: 0.5 };
    expect(mayQualify({ builds: 500, failedBuilds: 2 }, strict)).toBe(true);
  });
});

describe('flakiestQualifyingBranch', () => {
  const branch = (name: string, builds: number, failedBuilds: number) => ({
    branch: name,
    builds,
    failedBuilds,
  });

  it('picks the branch with the highest failure rate among those clearing every threshold', () => {
    expect(
      flakiestQualifyingBranch(
        [branch('main', 500, 10), branch('9.5', 100, 8), branch('9.4', 50, 2)],
        thresholds
      )
    ).toEqual({ branch: '9.5', builds: 100, failedBuilds: 8, buildFailRate: 0.08 });
  });

  it('is not diluted: a branch qualifies on its own numbers even when the total would not', () => {
    // 10 of 610 in total is 1.6%; 9.5 alone is 8%
    const byBranch = [branch('main', 500, 2), branch('9.5', 100, 8), branch('9.4', 10, 0)];
    expect(flakiestQualifyingBranch(byBranch, { ...thresholds, minFailRate: 0.05 })).toEqual({
      branch: '9.5',
      builds: 100,
      failedBuilds: 8,
      buildFailRate: 0.08,
    });
  });

  it('ignores branches with too few builds or failed builds, whatever their rate', () => {
    expect(
      flakiestQualifyingBranch(
        // 9.4 is at 100% but on a single build; 9.5 failed once
        [branch('main', 500, 5), branch('9.5', 100, 1), branch('9.4', 1, 1)],
        thresholds
      )
    ).toEqual({ branch: 'main', builds: 500, failedBuilds: 5, buildFailRate: 0.01 });
  });

  it('is undefined when no branch clears the thresholds on its own', () => {
    // 4 failed builds in total, but 2 per branch on branches of 500 builds: 0.4% < 1%
    expect(
      flakiestQualifyingBranch([branch('main', 500, 2), branch('9.5', 500, 2)], {
        ...thresholds,
        minFailRate: 0.01,
      })
    ).toBeUndefined();
    expect(flakiestQualifyingBranch([branch('main', 9, 5)], thresholds)).toBeUndefined();
    expect(flakiestQualifyingBranch([], thresholds)).toBeUndefined();
  });

  it('breaks rate ties by failed builds', () => {
    expect(
      flakiestQualifyingBranch([branch('main', 100, 10), branch('9.5', 20, 2)], thresholds)?.branch
    ).toBe('main');
  });
});

/** Builds run an hour apart, build 0 on Oct 1, 2026. */
const FIRST_BUILD_AT = Date.UTC(2026, 9, 1);
const HOUR_MS = 60 * 60 * 1000;

/** Builds of one setup numbered from `first` on, oldest first: `x` failed, `.` passed. */
const setupBuilds = (pattern: string, first = 1, branch = 'main'): SetupBuilds => ({
  branch,
  setup: 'kibana-on-merge a.config.ts stateful-classic local',
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

const branchCounts = (branch: string, builds: number, failedBuilds: number) => ({
  branch,
  builds,
  failedBuilds,
});

describe('checkFlakyTest', () => {
  const strict = { ...thresholds, minFailRate: 0.03 };
  /** An hour after the build numbered `last`. */
  const after = (last: number, hours = 1) => new Date(FIRST_BUILD_AT + (last + hours) * HOUR_MS);

  it('does nothing to a test without breakages that still fails', () => {
    expect(
      checkFlakyTest(
        [setupBuilds(`${'.'.repeat(45)}x....x....`)],
        [branchCounts('main', 55, 2)],
        strict,
        after(55, 48)
      )
    ).toEqual({ outcome: 'none' });
    expect(checkFlakyTest([], [], strict, after(0))).toEqual({ outcome: 'none' });
  });

  it('drops a test broken up to its latest build, whatever its other builds show', () => {
    const setups = [
      setupBuilds(`${'.'.repeat(80)}${'x'.repeat(20)}`),
      // flaky enough on 9.5 on its own
      setupBuilds(`${'.'.repeat(15)}x...x.x...`, 500, '9.5'),
    ];
    const counts = [branchCounts('main', 100, 20), branchCounts('9.5', 25, 3)];

    expect(checkFlakyTest(setups, counts, strict, after(524))).toEqual({
      outcome: 'dropped',
      cause: 'broken',
      reason:
        'broken right now, 20 failed builds in a row on main (#81 to #100) in ' +
        'kibana-on-merge a.config.ts stateful-classic local',
    });
  });

  it('drops a test that clears the thresholds only thanks to a past breakage', () => {
    // 13 of 200 failed, 12 of them in a row: 1 of 188 builds otherwise
    const setups = [setupBuilds(`${'.'.repeat(90)}${'x'.repeat(12)}${'.'.repeat(90)}x.......`)];

    expect(checkFlakyTest(setups, [branchCounts('main', 200, 13)], strict, after(200))).toEqual({
      outcome: 'dropped',
      cause: 'breakages',
      reason:
        'below the thresholds without its breakage, 12 failed builds in a row on main ' +
        '(#91 to #102) in kibana-on-merge a.config.ts stateful-classic local',
    });
  });

  it('names the longest of several past breakages', () => {
    const setups = [
      setupBuilds(`${'.'.repeat(90)}xxxxx${'.'.repeat(50)}${'x'.repeat(8)}${'.'.repeat(50)}`),
    ];

    expect(checkFlakyTest(setups, [branchCounts('main', 203, 13)], strict, after(203))).toEqual({
      outcome: 'dropped',
      cause: 'breakages',
      reason:
        'below the thresholds without its 2 breakages, the longest 8 failed builds in a row on ' +
        'main (#146 to #153) in kibana-on-merge a.config.ts stateful-classic local',
    });
  });

  it('keeps a test flaky apart from a past breakage, counted without it', () => {
    // 8 of 170 builds still failed outside the breakage
    const scattered = `${'.'.repeat(20)}x`.repeat(4);
    const pattern = `${scattered}.${'x'.repeat(12)}.${scattered}`;
    const counts = [branchCounts('main', 182, 20)];
    const kept = {
      outcome: 'kept',
      breakageBuilds: 12,
      flakiestBranch: { branch: 'main', builds: 170, failedBuilds: 8, buildFailRate: 8 / 170 },
    };

    expect(checkFlakyTest([setupBuilds(pattern)], counts, strict, after(182))).toEqual(kept);
    // the same builds broke in a second setup: each is taken off once
    const secondSetup = {
      ...setupBuilds(pattern),
      setup: 'kibana-on-merge b.config.ts serverless local',
    };
    expect(checkFlakyTest([setupBuilds(pattern), secondSetup], counts, strict, after(182))).toEqual(
      kept
    );
  });

  describe('a test that stopped failing', () => {
    // 10 of 150 failed, the last at build 100, then 50 clean builds: 3.3 failures missed at 6.7%
    const pattern = `${'.........x'.repeat(10)}${'.'.repeat(50)}`;
    const counts = [branchCounts('main', 150, 10)];

    it('is dropped as fixed once it missed enough failures, a day after its last one', () => {
      expect(checkFlakyTest([setupBuilds(pattern)], counts, strict, after(100, 24))).toEqual({
        outcome: 'dropped',
        cause: 'fixed',
        reason: 'fixed, no failures in the 50 builds on main since 2026-10-05',
      });
    });

    it('is kept within a day of its last failure', () => {
      expect(checkFlakyTest([setupBuilds(pattern)], counts, strict, after(100, 23))).toEqual({
        outcome: 'none',
      });
    });

    it('is kept until it missed enough failures', () => {
      // 15 clean builds: 1.3 failures missed at 8.7%
      const fewer = `${'.........x'.repeat(10)}${'.'.repeat(15)}`;
      expect(
        checkFlakyTest([setupBuilds(fewer)], [branchCounts('main', 115, 10)], strict, after(500))
      ).toEqual({ outcome: 'none' });
    });

    it('is kept while it still fails on another branch it qualifies on', () => {
      const setups = [setupBuilds(pattern), setupBuilds('.........x'.repeat(10), 1000, '9.6')];
      const bothCounts = [...counts, branchCounts('9.6', 100, 10)];
      expect(checkFlakyTest(setups, bothCounts, strict, after(1100, 24))).toEqual({
        outcome: 'none',
      });
    });

    it('is judged on its failure rate without its breakages', () => {
      // 5 of 110 failed outside a 20 build breakage: 1.4 failures missed, 5.8 with the breakage
      const flaky = '.........x'.repeat(5);
      const withBreakage = `${'.'.repeat(30)}${'x'.repeat(20)}${flaky}${'.'.repeat(30)}`;
      const breakageCounts = [branchCounts('main', 130, 25)];
      expect(
        checkFlakyTest([setupBuilds(withBreakage)], breakageCounts, strict, after(100, 24))
      ).toMatchObject({ outcome: 'kept' });
    });

    it('counts a breakage as its last failure', () => {
      // 10 of 145 failed outside a 12 build breakage that ended 5 builds ago: 35 clean builds
      // since the failure before it would be enough, the 5 since the breakage are not
      const breakageSince = `${'.........x'.repeat(10)}${'.'.repeat(30)}${'x'.repeat(12)}.....`;
      expect(
        checkFlakyTest(
          [setupBuilds(breakageSince)],
          [branchCounts('main', 157, 22)],
          strict,
          after(157, 48)
        )
      ).toEqual({
        outcome: 'kept',
        breakageBuilds: 12,
        flakiestBranch: { branch: 'main', builds: 145, failedBuilds: 10, buildFailRate: 10 / 145 },
      });
    });
  });
});

describe('classifyTest', () => {
  it('is flaky when the test also passed cleanly', () => {
    expect(classifyTest({ runs: 50, fails: 5, retryFlakes: 0 })).toBe('flaky');
  });

  it('is flaky when every execution failed but some recovered on an in-run retry', () => {
    expect(classifyTest({ runs: 20, fails: 20, retryFlakes: 18 })).toBe('flaky');
  });

  it('is consistently failing when it never passed', () => {
    expect(classifyTest({ runs: 20, fails: 20, retryFlakes: 0 })).toBe('consistently-failing');
  });
});

describe('rankTests', () => {
  it('orders by failed builds, then failure rate on the flakiest branch, then most recent failure', () => {
    const flakiest = (buildFailRate: number) => ({
      branch: 'main',
      builds: 100,
      failedBuilds: 2,
      buildFailRate,
    });
    const entries = [
      { id: 'a', failedBuilds: 2, buildFailRate: 0.5, lastFailedAt: new Date('2026-09-01') },
      { id: 'b', failedBuilds: 5, buildFailRate: 0.1, lastFailedAt: new Date('2026-09-01') },
      { id: 'c', failedBuilds: 2, buildFailRate: 0.5, lastFailedAt: new Date('2026-09-03') },
      { id: 'd', failedBuilds: 2, buildFailRate: 0.9, lastFailedAt: new Date('2026-09-01') },
      // the flakiest branch rate outranks the diluted total when present
      {
        id: 'e',
        failedBuilds: 2,
        buildFailRate: 0.01,
        flakiestBranch: flakiest(0.95),
        lastFailedAt: new Date('2026-09-01'),
      },
    ];

    expect(rankTests(entries).map((entry) => entry.id)).toEqual(['b', 'e', 'd', 'c', 'a']);
    expect(entries.map((entry) => entry.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('latestRunAcrossBranches', () => {
  const branch = (name: string, latestRun?: { status: string; timestamp: Date }) => ({
    branch: name,
    builds: 10,
    failedBuilds: 1,
    buildFailRate: 0.1,
    latestRun,
  });

  it('returns the newest per-branch run tagged with its branch', () => {
    expect(
      latestRunAcrossBranches([
        branch('main', { status: 'passed', timestamp: new Date('2026-09-06T00:00:00.000Z') }),
        branch('9.4'),
        branch('9.5', { status: 'failed', timestamp: new Date('2026-09-06T12:00:00.000Z') }),
      ])
    ).toEqual({
      status: 'failed',
      timestamp: new Date('2026-09-06T12:00:00.000Z'),
      branch: '9.5',
    });
  });

  it('is undefined without any run', () => {
    expect(latestRunAcrossBranches(undefined)).toBeUndefined();
    expect(latestRunAcrossBranches([branch('main')])).toBeUndefined();
  });
});

describe('ScoutFlakyTests.fromElasticsearch', () => {
  const log = new ToolingLog();
  const es = {} as any;
  const options = {
    ...DEFAULT_FLAKY_TEST_REPORT_OPTIONS,
    thresholds: { ...thresholds, maxTests: 1 },
    now: new Date('2026-09-07T00:00:00.000Z'),
  };

  const statsRow = (overrides: Partial<queries.TestStatsRow>): queries.TestStatsRow => ({
    testId: 't',
    framework: 'jest',
    runs: 100,
    fails: 10,
    retryFlakes: 0,
    builds: 100,
    failedBuilds: 10,
    failedBranches: 1,
    firstFailedAt: new Date('2026-09-01T00:00:00.000Z'),
    lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
    ...overrides,
  });

  const activeBranch = (overrides: Partial<FlakyTestBranchStats> = {}): FlakyTestBranchStats => ({
    branch: 'main',
    builds: 100,
    failedBuilds: 10,
    buildFailRate: 0.1,
    latestExecutionAt: new Date('2026-09-06T23:00:00.000Z'),
    latestRun: { status: 'passed', timestamp: new Date('2026-09-06T23:00:00.000Z') },
    ...overrides,
  });

  const activeBranchStats = (testIds: string[]) =>
    new Map(testIds.map((testId) => [testId, [activeBranch()]]));

  /** Counts on `main` that clear the thresholds. */
  const mainCounts = (
    overrides: Partial<queries.BranchCountsRow> = {}
  ): queries.BranchCountsRow => ({
    branch: 'main',
    builds: 100,
    failedBuilds: 10,
    ...overrides,
  });
  const qualifyingFlakiestBranch = {
    branch: 'main',
    builds: 100,
    failedBuilds: 10,
    buildFailRate: 0.1,
  };

  /** Branch counts where every test in `testIds` qualifies on `main`. */
  const activeCounts = (testIds: string[]) =>
    new Map(testIds.map((testId) => [testId, [mainCounts()]]));

  beforeEach(() => {
    jest.spyOn(queries, 'fetchSetupBuilds').mockResolvedValue({ byTest: new Map(), truncated: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects a non-positive or fractional lookback', async () => {
    await expect(
      ScoutFlakyTests.fromElasticsearch(es, { ...options, lookbackDays: 0 }, log)
    ).rejects.toThrow('lookbackDays must be a positive integer, got 0');
    await expect(
      ScoutFlakyTests.fromElasticsearch(es, { ...options, lookbackDays: 1.5 }, log)
    ).rejects.toThrow('lookbackDays must be a positive integer, got 1.5');
  });

  it('rejects an empty classification list', async () => {
    await expect(
      ScoutFlakyTests.fromElasticsearch(es, { ...options, classifications: [] }, log)
    ).rejects.toThrow('classifications must include at least one of');
  });

  it('drops tests of an excluded classification before the per-test lookups', async () => {
    jest
      .spyOn(queries, 'fetchFailingFiles')
      .mockResolvedValue([{ framework: 'jest', filePath: 'a.test.ts' }]);
    jest
      .spyOn(queries, 'fetchTestStats')
      .mockResolvedValue([
        statsRow({ testId: 'jest-flaky', failedBuilds: 3 }),
        statsRow({ testId: 'jest-broken', runs: 20, fails: 20, builds: 20, failedBuilds: 20 }),
      ]);
    const fetchBranchCounts = jest
      .spyOn(queries, 'fetchBranchCounts')
      .mockResolvedValue(activeCounts(['jest-flaky']));
    jest.spyOn(queries, 'fetchTestMetadata').mockResolvedValue(new Map());
    const fetchBranchStats = jest
      .spyOn(queries, 'fetchBranchStats')
      .mockResolvedValue(activeBranchStats(['jest-flaky']));
    jest.spyOn(queries, 'fetchTargetStats').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchTestErrors').mockResolvedValue(new Map());
    const fetchSampleFailures = jest
      .spyOn(queries, 'fetchSampleFailures')
      .mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchFilePipelineStats').mockResolvedValue(new Map());

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(
      es,
      { ...options, classifications: ['flaky'] },
      log
    );

    expect(report.scope.classifications).toEqual(['flaky']);
    expect(report.flaky.map((entry) => entry.testId)).toEqual(['jest-flaky']);
    expect(report.consistentlyFailing).toEqual([]);
    expect(report.summary).toEqual({
      totalFlaky: 1,
      totalConsistentlyFailing: 0,
      flakyByFramework: { jest: 1 },
      flakyByBranch: { main: 1 },
    });
    // the excluded classification never reaches the per-branch check either
    expect(fetchBranchCounts).toHaveBeenCalledWith(
      es,
      expect.anything(),
      [expect.objectContaining({ testId: 'jest-flaky' })],
      options.thresholds
    );
    expect(fetchBranchStats).toHaveBeenCalledWith(es, expect.anything(), [
      expect.objectContaining({ testId: 'jest-flaky' }),
    ]);
    expect(fetchSampleFailures).toHaveBeenCalledWith(
      es,
      expect.anything(),
      ['jest-flaky'],
      options.samplesPerTest
    );
  });

  it('aggregates per framework, classifies, ranks, caps and decorates the result', async () => {
    jest.spyOn(queries, 'fetchFailingFiles').mockResolvedValue([
      { framework: 'jest', filePath: 'a.test.ts' },
      { framework: 'jest', filePath: 'b.test.ts' },
      { framework: 'playwright', filePath: 'c.spec.ts' },
    ]);
    const fetchTestStats = jest
      .spyOn(queries, 'fetchTestStats')
      .mockImplementation(async (_es, _scope, framework) =>
        framework === 'jest'
          ? [
              statsRow({ testId: 'jest-flaky-low', failedBuilds: 3 }),
              statsRow({ testId: 'jest-flaky-high', failedBuilds: 30 }),
              statsRow({
                testId: 'jest-broken',
                runs: 20,
                fails: 20,
                builds: 20,
                failedBuilds: 20,
              }),
              statsRow({ testId: 'jest-rare', failedBuilds: 1, fails: 1 }),
            ]
          : [statsRow({ testId: 'pw-flaky', framework: 'playwright', failedBuilds: 5 })]
      );
    const fetchBranchCounts = jest.spyOn(queries, 'fetchBranchCounts').mockResolvedValue(
      new Map([
        ...activeCounts(['jest-flaky-low', 'jest-broken', 'pw-flaky']),
        [
          'jest-flaky-high',
          [
            mainCounts({ builds: 90, failedBuilds: 30 }),
            // 9.5 never failed it
            mainCounts({
              branch: '9.5',
              builds: 10,
              failedBuilds: 0,
            }),
          ],
        ],
      ])
    );
    jest.spyOn(queries, 'fetchTestMetadata').mockResolvedValue(
      new Map([
        [
          'jest-flaky-high',
          {
            testId: 'jest-flaky-high',
            title: 'flakes a lot',
            suiteTitle: 'flaky suite',
            filePath: 'a.test.ts',
            configPath: 'jest.config.js',
            configCategory: 'unit-test',
            owners: ['elastic/team'],
            areas: ['platform'],
          },
        ],
      ])
    );
    const fetchSampleFailures = jest
      .spyOn(queries, 'fetchSampleFailures')
      .mockResolvedValue(
        new Map([
          [
            'jest-flaky-high',
            [{ message: 'boom', buildUrl: 'https://b/1', timestamp: new Date('2026-09-06') }],
          ],
        ])
      );
    const targetStats = [
      {
        mode: 'unknown',
        type: 'local',
        builds: 100,
        failedBuilds: 30,
        buildFailRate: 0.3,
        lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
      },
    ];
    const fetchTargetStats = jest
      .spyOn(queries, 'fetchTargetStats')
      .mockResolvedValue(new Map([['jest-flaky-high', targetStats]]));
    const errors = [
      {
        key: 'boom',
        message: 'boom',
        buildsCount: 2,
        byPipeline: [{ pipeline: 'kibana-on-merge', buildsCount: 2, buildIds: ['b1', 'b2'] }],
        branches: ['main'],
        targets: ['unknown'],
        firstFailedAt: new Date('2026-09-01T00:00:00.000Z'),
        lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
        lastFailedBuildUrl: 'https://b/1',
        lastFailedJobId: 'job-1',
      },
    ];
    const fetchTestErrors = jest
      .spyOn(queries, 'fetchTestErrors')
      .mockResolvedValue(new Map([['jest-flaky-high', errors]]));
    const fetchBranchStats = jest.spyOn(queries, 'fetchBranchStats').mockResolvedValue(
      new Map([
        [
          'jest-flaky-high',
          [
            activeBranch({
              branch: 'main',
              builds: 90,
              failedBuilds: 30,
              buildFailRate: 30 / 90,
              latestExecutionAt: new Date('2026-09-06T06:00:00.000Z'),
              latestRun: { status: 'passed', timestamp: new Date('2026-09-06T06:00:00.000Z') },
            }),
            activeBranch({
              branch: '9.5',
              builds: 10,
              failedBuilds: 0,
              buildFailRate: 0,
              latestExecutionAt: undefined,
              latestRun: { status: 'skipped', timestamp: new Date('2026-09-06T12:00:00.000Z') },
            }),
          ],
        ],
        ['jest-broken', [activeBranch()]],
      ])
    );
    const pipelineStats = [
      {
        pipeline: 'kibana-on-merge',
        builds: 90,
        failedBuilds: 30,
        buildFailRate: 30 / 90,
        failedBranches: 1,
        lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
        lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/1',
      },
    ];
    const fetchFilePipelineStats = jest
      .spyOn(queries, 'fetchFilePipelineStats')
      .mockResolvedValue(new Map([[queries.fileStatsKey('jest', 'a.test.ts'), pipelineStats]]));

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(es, options, log);

    expect(fetchTestStats).toHaveBeenCalledTimes(2);
    expect(fetchTestStats).toHaveBeenCalledWith(es, expect.anything(), 'jest', [
      'a.test.ts',
      'b.test.ts',
    ]);
    expect(fetchTestStats).toHaveBeenCalledWith(es, expect.anything(), 'playwright', ['c.spec.ts']);

    expect(report.window).toEqual({
      lookbackDays: 7,
      from: new Date('2026-08-31T00:00:00.000Z'),
      to: new Date('2026-09-07T00:00:00.000Z'),
    });
    expect(report.summary).toEqual({
      totalFlaky: 1,
      totalConsistentlyFailing: 1,
      flakyByFramework: { jest: 1 },
      flakyByBranch: { main: 1 },
    });

    // maxTests = 1 keeps only the highest ranked flaky test
    expect(report.flaky.map((entry) => entry.testId)).toEqual(['jest-flaky-high']);
    expect(report.flaky[0]).toMatchObject({
      framework: 'jest',
      title: 'flakes a lot',
      suiteTitle: 'flaky suite',
      filePath: 'a.test.ts',
      configPath: 'jest.config.js',
      configCategory: 'unit-test',
      owners: ['elastic/team'],
      passes: 90,
      buildFailRate: 0.3,
      // the branch it qualified on, at its own undiluted rate
      flakiestBranch: { branch: 'main', builds: 90, failedBuilds: 30, buildFailRate: 30 / 90 },
      // the newest run across branches
      latestRun: { status: 'skipped', branch: '9.5' },
      byBranch: [
        { branch: 'main', builds: 90, failedBuilds: 30, latestRun: { status: 'passed' } },
        { branch: '9.5', builds: 10, failedBuilds: 0, latestRun: { status: 'skipped' } },
      ],
      byTarget: targetStats,
      sampleFailures: [{ message: 'boom', buildUrl: 'https://b/1' }],
      errors,
    });

    expect(report.consistentlyFailing.map((entry) => entry.testId)).toEqual(['jest-broken']);
    expect(report.consistentlyFailing[0]).toMatchObject({
      title: '(unknown)',
      filePath: '(unknown)',
      owners: [],
      flakiestBranch: qualifyingFlakiestBranch,
      byTarget: [],
      sampleFailures: [],
      errors: [],
    });
    expect(report.consistentlyFailing[0].suiteTitle).toBeUndefined();

    // one file entry per (framework, path) over both lists, carrying the per-pipeline breakdown
    expect(report.files).toEqual([
      {
        filePath: 'a.test.ts',
        framework: 'jest',
        testIds: ['jest-flaky-high'],
        byPipeline: pipelineStats,
      },
      { filePath: '(unknown)', framework: 'jest', testIds: ['jest-broken'], byPipeline: [] },
    ]);

    // the per-branch check runs for every test whose totals may qualify, before the cap;
    // `jest-rare` failed in a single build and is out already
    expect(fetchBranchCounts).toHaveBeenCalledWith(
      es,
      expect.anything(),
      ['jest-flaky-low', 'jest-flaky-high', 'jest-broken', 'pw-flaky'].map((testId) =>
        expect.objectContaining({ testId })
      ),
      options.thresholds
    );

    // per-test lookups only run for admitted tests
    const admittedIds = ['jest-flaky-high', 'jest-broken'];
    const admitted = admittedIds.map((testId) =>
      expect.objectContaining({ testId, framework: 'jest' })
    );
    expect(fetchBranchStats).toHaveBeenCalledWith(es, expect.anything(), admitted);
    expect(fetchTargetStats).toHaveBeenCalledWith(es, expect.anything(), admitted);
    expect(fetchTestErrors).toHaveBeenCalledWith(es, expect.anything(), admitted);
    expect(fetchSampleFailures).toHaveBeenCalledWith(
      es,
      expect.anything(),
      admittedIds,
      options.samplesPerTest
    );
    expect(fetchFilePipelineStats).toHaveBeenCalledWith(es, expect.anything(), admitted);
  });

  it('checks thresholds per branch before ranking, so the cap is filled with tests that qualify', async () => {
    jest.spyOn(queries, 'fetchFailingFiles').mockResolvedValue([
      { framework: 'jest', filePath: 'a.test.ts' },
      { framework: 'jest', filePath: 'b.test.ts' },
    ]);
    jest.spyOn(queries, 'fetchTestStats').mockResolvedValue([
      // 12 of 1000 in total is 1.2%, above the 1% required, but spread thin over two branches
      statsRow({ testId: 'diluted', builds: 1000, failedBuilds: 12 }),
      // 6 of 600 in total is 1%; on 9.5 alone it is 5 of 100
      statsRow({ testId: 'flaky-on-9.5', builds: 600, failedBuilds: 6 }),
      statsRow({ testId: 'still-running', failedBuilds: 20 }),
    ]);
    // `diluted` outranks `flaky-on-9.5` and would have taken a slot had the check happened after the cap
    const fetchBranchCounts = jest
      .spyOn(queries, 'fetchBranchCounts')
      .mockResolvedValue(
        new Map([
          [
            'diluted',
            [
              mainCounts({ builds: 500, failedBuilds: 4 }),
              mainCounts({ branch: '9.5', builds: 500, failedBuilds: 8 }),
            ],
          ],
          [
            'flaky-on-9.5',
            [
              mainCounts({ builds: 500, failedBuilds: 1 }),
              mainCounts({ branch: '9.5', builds: 100, failedBuilds: 5 }),
            ],
          ],
          ...activeCounts(['still-running']),
        ])
      );
    const fetchTestMetadata = jest.spyOn(queries, 'fetchTestMetadata').mockResolvedValue(new Map());
    const fetchBranchStats = jest
      .spyOn(queries, 'fetchBranchStats')
      .mockResolvedValue(activeBranchStats(['flaky-on-9.5', 'still-running']));
    jest.spyOn(queries, 'fetchTargetStats').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchTestErrors').mockResolvedValue(new Map());
    const fetchSampleFailures = jest
      .spyOn(queries, 'fetchSampleFailures')
      .mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchFilePipelineStats').mockResolvedValue(new Map());

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(
      es,
      { ...options, thresholds: { ...thresholds, minFailRate: 0.02, maxTests: 2 } },
      log
    );

    expect(fetchBranchCounts).toHaveBeenCalledWith(
      es,
      expect.anything(),
      ['diluted', 'flaky-on-9.5', 'still-running'].map((testId) =>
        expect.objectContaining({ testId })
      ),
      { ...thresholds, minFailRate: 0.02, maxTests: 2 }
    );
    // `still-running` failed in more builds; `flaky-on-9.5` qualifies on 9.5 despite its 1% total
    expect(report.flaky.map((entry) => entry.testId)).toEqual(['still-running', 'flaky-on-9.5']);
    expect(report.flaky[1]).toMatchObject({
      buildFailRate: 0.01,
      flakiestBranch: { branch: '9.5', builds: 100, failedBuilds: 5, buildFailRate: 0.05 },
    });
    expect(report.summary.totalFlaky).toBe(2);
    expect(report.files.map((file) => file.testIds)).toEqual([['still-running', 'flaky-on-9.5']]);
    // the dropped tests are gone before any further lookup
    expect(fetchTestMetadata).toHaveBeenCalledTimes(1);
    expect(fetchBranchStats).toHaveBeenCalledWith(es, expect.anything(), [
      expect.objectContaining({ testId: 'still-running' }),
      expect.objectContaining({ testId: 'flaky-on-9.5' }),
    ]);
    expect(fetchSampleFailures).toHaveBeenCalledWith(
      es,
      expect.anything(),
      ['still-running', 'flaky-on-9.5'],
      options.samplesPerTest
    );
  });

  it('leaves out flaky tests whose failures are breakages before ranking, so the cap is filled with flaky tests', async () => {
    jest
      .spyOn(queries, 'fetchFailingFiles')
      .mockResolvedValue([{ framework: 'jest', filePath: 'a.test.ts' }]);
    jest.spyOn(queries, 'fetchTestStats').mockResolvedValue([
      // outranks `flaky` and would take the only slot
      statsRow({ testId: 'broken', failedBuilds: 20 }),
      statsRow({ testId: 'flaky' }),
      statsRow({ testId: 'never-passed', runs: 20, fails: 20, builds: 20, failedBuilds: 20 }),
    ]);
    jest
      .spyOn(queries, 'fetchBranchCounts')
      .mockResolvedValue(activeCounts(['broken', 'flaky', 'never-passed']));
    jest
      .spyOn(queries, 'fetchTestMetadata')
      .mockResolvedValue(
        new Map([
          [
            'broken',
            { testId: 'broken', title: 'breaks', filePath: 'a.test.ts', owners: [], areas: [] },
          ],
        ])
      );
    const fetchSetupBuilds = jest.spyOn(queries, 'fetchSetupBuilds').mockResolvedValue({
      byTest: new Map([
        ['broken', [setupBuilds(`${'.'.repeat(80)}${'x'.repeat(20)}`)]],
        ['flaky', [setupBuilds(`${'.....x....'.repeat(10)}`)]],
      ]),
      truncated: [],
    });
    const fetchBranchStats = jest
      .spyOn(queries, 'fetchBranchStats')
      .mockResolvedValue(activeBranchStats(['flaky']));
    jest.spyOn(queries, 'fetchTargetStats').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchTestErrors').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchSampleFailures').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchFilePipelineStats').mockResolvedValue(new Map());
    const info = jest.spyOn(log, 'info');

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(es, options, log);

    // only flaky tests are checked: one that never passed is no flaky issue either way
    expect(fetchSetupBuilds).toHaveBeenCalledWith(es, expect.anything(), [
      expect.objectContaining({ testId: 'broken' }),
      expect.objectContaining({ testId: 'flaky' }),
    ]);
    expect(report.flaky.map((entry) => entry.testId)).toEqual(['flaky']);
    expect(report.consistentlyFailing.map((entry) => entry.testId)).toEqual(['never-passed']);
    expect(fetchBranchStats).toHaveBeenCalledWith(es, expect.anything(), [
      expect.objectContaining({ testId: 'flaky' }),
      expect.objectContaining({ testId: 'never-passed' }),
    ]);
    expect(info).toHaveBeenCalledWith(
      'Dropped a.test.ts › breaks from the report: broken right now, 20 failed builds in a row on main ' +
        '(#81 to #100) in kibana-on-merge a.config.ts stateful-classic local'
    );
  });

  it('counts and ranks a flaky test kept despite a past breakage without the builds of it', async () => {
    jest
      .spyOn(queries, 'fetchFailingFiles')
      .mockResolvedValue([{ framework: 'jest', filePath: 'a.test.ts' }]);
    jest.spyOn(queries, 'fetchTestStats').mockResolvedValue([
      // 20 failed builds, 12 of them in a row
      statsRow({ testId: 'past-breakage', failedBuilds: 20 }),
      statsRow({ testId: 'steady' }),
    ]);
    jest.spyOn(queries, 'fetchBranchCounts').mockResolvedValue(
      new Map([
        ['past-breakage', [mainCounts({ failedBuilds: 20 })]],
        ['steady', [mainCounts()]],
      ])
    );
    jest.spyOn(queries, 'fetchTestMetadata').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchSetupBuilds').mockResolvedValue({
      byTest: new Map([
        [
          'past-breakage',
          [
            setupBuilds(
              `${`${'.'.repeat(9)}x`.repeat(4)}.${'x'.repeat(12)}.` +
                `${`${'.'.repeat(10)}x`.repeat(4)}..`
            ),
          ],
        ],
        ['steady', [setupBuilds(`${'.'.repeat(9)}x`.repeat(10))]],
      ]),
      truncated: [],
    });
    jest
      .spyOn(queries, 'fetchBranchStats')
      .mockResolvedValue(activeBranchStats(['past-breakage', 'steady']));
    jest.spyOn(queries, 'fetchTargetStats').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchTestErrors').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchSampleFailures').mockResolvedValue(new Map());
    jest.spyOn(queries, 'fetchFilePipelineStats').mockResolvedValue(new Map());
    const info = jest.spyOn(log, 'info');

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(
      es,
      { ...options, thresholds: { ...thresholds, maxTests: 2 } },
      log
    );

    expect(report.flaky.map((entry) => entry.testId)).toEqual(['steady', 'past-breakage']);
    expect(report.flaky[1]).toMatchObject({
      builds: 88,
      failedBuilds: 8,
      buildFailRate: 8 / 88,
      flakiestBranch: { branch: 'main', builds: 88, failedBuilds: 8, buildFailRate: 8 / 88 },
    });
    expect(info).toHaveBeenCalledWith(
      'Kept past-breakage › (unknown), flaky even without its breakages; ' +
        'took the 12 builds of its breakages off its counts'
    );
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Checked 2 flaky tests for breakages \(failed builds in a row, too many to be chance\) and fixes in .+: dropped 0 from the report \(0 broken right now, 0 flaky only because of their breakages, 0 fixed: no failures in enough builds since their last one\); kept 1 that are flaky even without their breakages, with those builds taken off their counts; 1 unchanged$/
      )
    );
  });

  it('skips the remaining lookups once no test qualifies on a branch of its own', async () => {
    jest
      .spyOn(queries, 'fetchFailingFiles')
      .mockResolvedValue([{ framework: 'jest', filePath: 'a.test.ts' }]);
    jest
      .spyOn(queries, 'fetchTestStats')
      .mockResolvedValue([statsRow({ testId: 'skipped-since', failedBuilds: 30 })]);
    jest.spyOn(queries, 'fetchBranchCounts').mockResolvedValue(new Map());
    const fetchTestMetadata = jest.spyOn(queries, 'fetchTestMetadata');
    const fetchBranchStats = jest.spyOn(queries, 'fetchBranchStats');
    const fetchTargetStats = jest.spyOn(queries, 'fetchTargetStats');

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(es, options, log);

    expect(report.flaky).toEqual([]);
    expect(report.summary.totalFlaky).toBe(0);
    expect(fetchTestMetadata).not.toHaveBeenCalled();
    expect(fetchBranchStats).not.toHaveBeenCalled();
    expect(fetchTargetStats).not.toHaveBeenCalled();
  });

  it('skips metadata, branch stats and sample queries when nothing qualifies', async () => {
    jest.spyOn(queries, 'fetchFailingFiles').mockResolvedValue([]);
    const fetchTestStats = jest.spyOn(queries, 'fetchTestStats');
    const fetchBranchCounts = jest.spyOn(queries, 'fetchBranchCounts');
    const fetchTestMetadata = jest.spyOn(queries, 'fetchTestMetadata');
    const fetchBranchStats = jest.spyOn(queries, 'fetchBranchStats');
    const fetchTargetStats = jest.spyOn(queries, 'fetchTargetStats');
    const fetchTestErrors = jest.spyOn(queries, 'fetchTestErrors');
    const fetchSampleFailures = jest.spyOn(queries, 'fetchSampleFailures');
    const fetchFilePipelineStats = jest.spyOn(queries, 'fetchFilePipelineStats');

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(es, options, log);

    expect(report.flaky).toEqual([]);
    expect(report.consistentlyFailing).toEqual([]);
    expect(report.files).toEqual([]);
    expect(fetchTestStats).not.toHaveBeenCalled();
    expect(fetchBranchCounts).not.toHaveBeenCalled();
    expect(fetchTestMetadata).not.toHaveBeenCalled();
    expect(fetchBranchStats).not.toHaveBeenCalled();
    expect(fetchTargetStats).not.toHaveBeenCalled();
    expect(fetchTestErrors).not.toHaveBeenCalled();
    expect(fetchSampleFailures).not.toHaveBeenCalled();
    expect(fetchFilePipelineStats).not.toHaveBeenCalled();
  });
});

describe('ScoutFlakyTests.writeToFile / fromFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-flaky-tests-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('fails clearly when the file does not exist', () => {
    const missingPath = path.join(tmpDir, 'missing.json');
    expect(() => ScoutFlakyTests.fromFile(missingPath)).toThrow(
      `path ${missingPath} does not exist`
    );
  });

  it('fails clearly on a report written with another schema version', () => {
    const oldPath = path.join(tmpDir, 'old.json');
    fs.writeFileSync(oldPath, JSON.stringify({ schemaVersion: 1 }));
    expect(() => ScoutFlakyTests.fromFile(oldPath)).toThrow(
      `Flaky tests file ${oldPath} has schema version 1, expected 2; regenerate it with \`node scripts/scout discover-flaky-tests\``
    );
  });

  it('round-trips a report through JSON, creating parent directories', () => {
    const report = FlakyTestReportSchema.parse({
      schemaVersion: 2,
      generatedAt: '2026-09-07T00:00:00.000Z',
      window: { lookbackDays: 7, from: '2026-08-31T00:00:00.000Z', to: '2026-09-07T00:00:00.000Z' },
      scope: { pipelines: ['kibana-on-merge'], branches: [], frameworks: ['jest'] },
      thresholds: { minBuilds: 10, minFailedBuilds: 2, maxTests: 200 },
      summary: { totalFlaky: 1, totalConsistentlyFailing: 0, flakyByFramework: { jest: 1 } },
      flaky: [
        {
          testId: 't1',
          framework: 'jest',
          title: 'a test',
          filePath: 'a.test.ts',
          owners: [],
          areas: [],
          runs: 10,
          fails: 2,
          passes: 8,
          retryFlakes: 0,
          builds: 10,
          failedBuilds: 2,
          buildFailRate: 0.2,
          failedBranches: 1,
          byBranch: [
            {
              branch: 'main',
              builds: 10,
              failedBuilds: 2,
              buildFailRate: 0.2,
              lastFailedAt: '2026-09-02T00:00:00.000Z',
            },
          ],
          firstFailedAt: '2026-09-01T00:00:00.000Z',
          lastFailedAt: '2026-09-02T00:00:00.000Z',
          latestRun: { status: 'passed', timestamp: '2026-09-03T00:00:00.000Z', branch: 'main' },
          sampleFailures: [{ message: 'boom', timestamp: '2026-09-02T00:00:00.000Z' }],
        },
      ],
      consistentlyFailing: [],
    });

    // reports written before `scope.classifications` existed default to both lists
    expect(report.scope.classifications).toEqual(['flaky', 'consistently-failing']);
    // likewise for the per-branch counts, the per-target breakdown and the per-file breakdown
    expect(report.summary.flakyByBranch).toEqual({});
    expect(report.flaky[0].byTarget).toEqual([]);
    expect(report.flaky[0].errors).toEqual([]);
    expect(report.files).toEqual([]);

    const outputPath = path.join(tmpDir, 'nested', 'report.json');
    new ScoutFlakyTests(report).writeToFile(outputPath);

    expect(ScoutFlakyTests.fromFile(outputPath).data).toEqual(report);
  });
});
