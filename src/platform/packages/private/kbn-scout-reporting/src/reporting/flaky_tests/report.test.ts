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
import {
  countEpisodes,
  countTrailingHardFailures,
  latestRunAcrossBranches,
  qualifyBranch as qualifyBranchAt,
  qualifyTest as qualifyTestAt,
  rankTests,
  ScoutFlakyTests,
} from './report';
import {
  DEFAULT_FLAKY_TEST_REPORT_OPTIONS,
  FLAKY_TEST_REPORT_SCHEMA_VERSION,
  FlakyTestReportSchema,
  type FlakyTestBranchStats,
} from './schema';
import * as queries from './queries';

const thresholds = DEFAULT_FLAKY_TEST_REPORT_OPTIONS.thresholds;
const now = new Date('2026-09-07T00:00:00.000Z');
const qualifyBranch = (context: queries.BranchRuns, values = thresholds) =>
  qualifyBranchAt(context, values, now, 28);
const qualifyTest = (contexts: readonly queries.BranchRuns[], values = thresholds) =>
  qualifyTestAt(contexts, values, now, 28);

/** Runs from a pattern, oldest first: `.` passed, `f` failed then passed on a retry, `F` failed. */
const runs = (pattern: string): queries.BranchRun[] =>
  [...pattern].map((char, index) => ({
    build: index + 1,
    timestamp: new Date(now.getTime() - (pattern.length - index) * 60_000),
    suspectedIncident: false,
    failed: char !== '.',
    hard: char === 'F',
  }));

const branchRuns = (
  pattern: string,
  branch = 'main',
  pipeline = 'kibana-on-merge'
): queries.BranchRuns => ({
  pipeline,
  branch,
  configPath: 'config.ts',
  targetMode: 'unknown',
  targetType: 'unknown',
  runs: runs(pattern),
});

describe('DEFAULT_FLAKY_TEST_REPORT_OPTIONS', () => {
  it('counts separate failure episodes over the latest 200 runs of a branch by default', () => {
    expect(DEFAULT_FLAKY_TEST_REPORT_OPTIONS.thresholds).toMatchObject(thresholds);
  });
});

describe('countEpisodes', () => {
  it('counts runs of consecutive failed builds rather than failed builds', () => {
    expect(countEpisodes(runs('..FF..f.'))).toBe(2);
    expect(countEpisodes(runs('FFFFF'))).toBe(1);
    expect(countEpisodes(runs('f.f.f'))).toBe(3);
    expect(countEpisodes(runs('....'))).toBe(0);
    expect(countEpisodes([])).toBe(0);
  });
});

describe('countTrailingHardFailures', () => {
  it('counts the latest runs that failed without passing on a retry', () => {
    expect(countTrailingHardFailures(runs('..FFF'))).toBe(3);
    expect(countTrailingHardFailures(runs('FFF'))).toBe(3);
    // the latest run passed on a retry, or passed outright
    expect(countTrailingHardFailures(runs('FFf'))).toBe(0);
    expect(countTrailingHardFailures(runs('FF.'))).toBe(0);
    expect(countTrailingHardFailures([])).toBe(0);
  });
});

describe('qualifyBranch', () => {
  it('is flaky once the failures came in separate episodes', () => {
    expect(qualifyBranch(branchRuns('..f...F..'), thresholds)).toMatchObject({
      classification: 'flaky',
      flakiestBranch: {
        pipeline: 'kibana-on-merge',
        branch: 'main',
        builds: 9,
        failedBuilds: 2,
        buildFailRate: 2 / 9,
        episodes: 2,
      },
    });
  });

  it('distinguishes a resolved breakage from repeated retry recovery', () => {
    expect(qualifyBranch(branchRuns('...FFFFFF...'), thresholds)).toBeUndefined();
    expect(qualifyBranch(branchRuns('..ffff..'), thresholds)?.reasons).toContain(
      'repeated-retry-recovery'
    );
  });

  it('is consistently failing while its latest runs failed without passing on a retry', () => {
    // flaky before, broken now
    expect(qualifyBranch(branchRuns('.f..f..FFF'), thresholds)?.classification).toBe(
      'consistently-failing'
    );
    // failures that passed on a retry are flakes, however many in a row
    expect(qualifyBranch(branchRuns('.f..fff'), thresholds)?.classification).toBe('flaky');
    // Two terminal failures qualify with the default urgent threshold.
    expect(qualifyBranch(branchRuns('.....FF'), thresholds)?.classification).toBe(
      'consistently-failing'
    );
  });

  it('only judges the latest `maxRuns` runs', () => {
    expect(qualifyBranch(branchRuns('f....f...'), thresholds)?.classification).toBe('flaky');
    // the first episode is older than the latest 5 runs
    expect(qualifyBranch(branchRuns('f....f...'), { ...thresholds, maxRuns: 5 })).toBeUndefined();
  });
});

describe('qualifyTest', () => {
  it('judges each pipeline and branch on its own, so single episodes spread over them do not add up', () => {
    expect(
      qualifyTest(
        [
          branchRuns('..f..'),
          branchRuns('.f...', '9.5'),
          branchRuns('F....', 'main', 'appex-qa-serverless-kibana-scout-tests'),
        ],
        thresholds
      )
    ).toEqual([]);
    expect(qualifyTest([], thresholds)).toEqual([]);
  });

  it('retains persistent failures alongside flaky contexts and filters each independently', () => {
    const results = qualifyTest([
      branchRuns('FFF', 'main', 'cloud'),
      branchRuns('f.f', 'main', 'on-merge'),
      branchRuns('f.f', '9.5', 'on-merge'),
    ]);
    expect(results).toHaveLength(3);
    expect(
      results.filter(({ classification }) => classification === 'consistently-failing')
    ).toHaveLength(1);
    expect(results.filter(({ classification }) => classification === 'flaky')).toHaveLength(2);
  });
});

describe('rankTests', () => {
  it('orders by failed builds, then failure rate on the flakiest branch, then most recent failure', () => {
    const flakiest = (buildFailRate: number) => ({
      pipeline: 'kibana-on-merge',
      branch: 'main',
      builds: 100,
      failedBuilds: 2,
      buildFailRate,
      episodes: 2,
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

  /** Runs on `main` with two separate episodes, so the test qualifies there as flaky. */
  const flakyOnMain = branchRuns('.f...f....');
  /** Runs on `main` whose latest three failed, so the test qualifies there as consistently failing. */
  const brokenOnMain = branchRuns('.....FFF');

  /** Runs where every test in `testIds` qualifies as flaky on `main`. */
  const flakyRuns = (testIds: string[]) =>
    new Map(testIds.map((testId) => [testId, [flakyOnMain]]));

  let fetchIncidentJobs: jest.SpyInstance;
  beforeEach(() => {
    fetchIncidentJobs = jest
      .spyOn(queries, 'fetchIncidentJobs')
      .mockResolvedValue([{ jobId: 'incident', failedTests: 10, testIds: ['t'] }]);
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

  it('rejects invalid thresholds before querying test events', async () => {
    const fetchFailingFiles = jest.spyOn(queries, 'fetchFailingFiles');
    await expect(
      ScoutFlakyTests.fromElasticsearch(
        es,
        {
          ...options,
          thresholds: { ...thresholds, minConsecutiveFailures: 0 },
        },
        log
      )
    ).rejects.toThrow();
    await expect(
      ScoutFlakyTests.fromElasticsearch(
        es,
        {
          ...options,
          thresholds: { ...thresholds, maxRuns: 2, minEpisodes: 3 },
        },
        log
      )
    ).rejects.toThrow('maxRuns must be at least each recent qualification threshold');
    expect(fetchFailingFiles).not.toHaveBeenCalled();
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
    const fetchBranchRuns = jest.spyOn(queries, 'fetchBranchRuns').mockResolvedValue(
      new Map([
        ['jest-flaky', [flakyOnMain]],
        ['jest-broken', [brokenOnMain]],
      ])
    );
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
    // the per-branch check is what tells the two apart; the broken one goes no further
    expect(fetchBranchRuns).toHaveBeenCalledWith(
      es,
      expect.anything(),
      ['jest-flaky', 'jest-broken'].map((testId) => expect.objectContaining({ testId })),
      ['incident']
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

  it.each([['flaky', 'consistently-failing'], ['consistently-failing']] as const)(
    'retains mixed contexts when requesting %s',
    async (...classifications) => {
      jest
        .spyOn(queries, 'fetchFailingFiles')
        .mockResolvedValue([{ framework: 'jest', filePath: 'a.test.ts' }]);
      jest.spyOn(queries, 'fetchTestStats').mockResolvedValue([statsRow({ testId: 'mixed' })]);
      jest
        .spyOn(queries, 'fetchBranchRuns')
        .mockResolvedValue(
          new Map([
            [
              'mixed',
              [flakyOnMain, { ...branchRuns('FF'), pipeline: 'cloud', targetType: 'cloud' }],
            ],
          ])
        );
      jest.spyOn(queries, 'fetchTestMetadata').mockResolvedValue(new Map());
      const fetchBranchStats = jest.spyOn(queries, 'fetchBranchStats').mockResolvedValue(new Map());
      jest.spyOn(queries, 'fetchTargetStats').mockResolvedValue(new Map());
      jest.spyOn(queries, 'fetchTestErrors').mockResolvedValue(new Map());
      const fetchSampleFailures = jest
        .spyOn(queries, 'fetchSampleFailures')
        .mockResolvedValue(new Map());
      jest.spyOn(queries, 'fetchFilePipelineStats').mockResolvedValue(new Map());

      const { data: report } = await ScoutFlakyTests.fromElasticsearch(
        es,
        { ...options, classifications: [...classifications] },
        log
      );
      expect(report.consistentlyFailing).toHaveLength(1);
      expect(report.consistentlyFailing[0].flakiestBranch).toMatchObject({
        pipeline: 'cloud',
        targetType: 'cloud',
      });
      expect(report.consistentlyFailing[0].qualifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ classification: 'flaky' }),
          expect.objectContaining({ classification: 'consistently-failing' }),
        ])
      );
      expect(report.flaky).toHaveLength(
        classifications.some((classification) => classification === 'flaky') ? 1 : 0
      );
      expect(fetchBranchStats).toHaveBeenCalledWith(es, expect.anything(), [
        expect.objectContaining({ testId: 'mixed' }),
      ]);
      expect(fetchSampleFailures).toHaveBeenCalledWith(
        es,
        expect.anything(),
        ['mixed'],
        options.samplesPerTest
      );
      expect(report.files.flatMap(({ testIds }) => testIds)).toEqual(['mixed']);
    }
  );

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
    const fetchBranchRuns = jest.spyOn(queries, 'fetchBranchRuns').mockResolvedValue(
      new Map([
        ...flakyRuns(['jest-flaky-low', 'pw-flaky']),
        ['jest-broken', [brokenOnMain]],
        // 9.5 never failed it
        ['jest-flaky-high', [branchRuns('.fff.f..ff'), branchRuns('....', '9.5')]],
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
        failuresCount: 30,
        buildsCount: 30,
        byPipeline: [{ pipeline: 'kibana-on-merge', failuresCount: 30 }],
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
      lookbackDays: 28,
      from: new Date('2026-08-10T00:00:00.000Z'),
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
      flakiestBranch: {
        pipeline: 'kibana-on-merge',
        branch: 'main',
        builds: 10,
        failedBuilds: 6,
        buildFailRate: 0.6,
        episodes: 3,
      },
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
      flakiestBranch: {
        pipeline: 'kibana-on-merge',
        branch: 'main',
        builds: 8,
        failedBuilds: 3,
        buildFailRate: 3 / 8,
        episodes: 1,
      },
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

    // the per-branch check runs for every test whose totals may qualify, before the cap, leaving
    // incident annotations; `jest-rare` failed in a single build and is out already
    expect(fetchIncidentJobs).toHaveBeenCalledWith(
      es,
      expect.anything(),
      options.frameworks,
      options.thresholds.incidentFailures
    );
    expect(fetchBranchRuns).toHaveBeenCalledWith(
      es,
      expect.anything(),
      ['jest-flaky-low', 'jest-flaky-high', 'jest-broken', 'pw-flaky'].map((testId) =>
        expect.objectContaining({ testId })
      ),
      ['incident']
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
      // 12 failed builds in two episodes, but one on each branch
      statsRow({ testId: 'spread-thin', builds: 1000, failedBuilds: 12 }),
      // 5 failed builds; three separate episodes on 9.5 alone
      statsRow({ testId: 'flaky-on-9.5', builds: 500, failedBuilds: 5 }),
      statsRow({ testId: 'still-running', failedBuilds: 20 }),
    ]);
    // `spread-thin` outranks `flaky-on-9.5` and would have taken a slot had the check happened after the cap
    const fetchBranchRuns = jest
      .spyOn(queries, 'fetchBranchRuns')
      .mockResolvedValue(
        new Map([
          ['spread-thin', [branchRuns('..FFFFFF..'), branchRuns('.FFFFFF...', '9.5')]],
          ['flaky-on-9.5', [branchRuns('.....f....'), branchRuns('.f..ff..f.', '9.5')]],
          ...flakyRuns(['still-running']),
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
      { ...options, thresholds: { ...thresholds, maxTests: 2 } },
      log
    );

    expect(fetchBranchRuns).toHaveBeenCalledWith(
      es,
      expect.anything(),
      ['spread-thin', 'flaky-on-9.5', 'still-running'].map((testId) =>
        expect.objectContaining({ testId })
      ),
      ['incident']
    );
    // `still-running` failed in more builds; `flaky-on-9.5` qualifies on 9.5 despite its 1% total
    expect(report.flaky.map((entry) => entry.testId)).toEqual(['still-running', 'flaky-on-9.5']);
    expect(report.flaky[1]).toMatchObject({
      buildFailRate: 0.01,
      flakiestBranch: {
        branch: '9.5',
        builds: 10,
        failedBuilds: 4,
        buildFailRate: 0.4,
        episodes: 3,
      },
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

  it('skips the remaining lookups once no test qualifies on a branch of its own', async () => {
    jest
      .spyOn(queries, 'fetchFailingFiles')
      .mockResolvedValue([{ framework: 'jest', filePath: 'a.test.ts' }]);
    jest
      .spyOn(queries, 'fetchTestStats')
      .mockResolvedValue([statsRow({ testId: 'skipped-since', failedBuilds: 30 })]);
    jest.spyOn(queries, 'fetchBranchRuns').mockResolvedValue(new Map());
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
    const fetchBranchRuns = jest.spyOn(queries, 'fetchBranchRuns');
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
    expect(report.suspectedIncidents).toEqual([
      { jobId: 'incident', failedTests: 10, testIds: ['t'] },
    ]);
    expect(fetchTestStats).not.toHaveBeenCalled();
    expect(fetchIncidentJobs).toHaveBeenCalled();
    expect(fetchBranchRuns).not.toHaveBeenCalled();
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

  it('round-trips a report through JSON, creating parent directories', () => {
    const report = FlakyTestReportSchema.parse({
      schemaVersion: FLAKY_TEST_REPORT_SCHEMA_VERSION,
      generatedAt: '2026-09-07T00:00:00.000Z',
      window: { lookbackDays: 7, from: '2026-08-31T00:00:00.000Z', to: '2026-09-07T00:00:00.000Z' },
      scope: { pipelines: ['kibana-on-merge'], branches: [], frameworks: ['jest'] },
      thresholds: { minEpisodes: 2, maxRuns: 200, incidentFailures: 10, maxTests: 200 },
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
