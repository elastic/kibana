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
  classifyTest,
  flakiestQualifyingBranch,
  isActive,
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

const thresholds = { minBuilds: 10, minFailedBuilds: 2, minFailRate: 0, maxInactiveHours: 24 };

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

describe('isActive', () => {
  const to = new Date('2026-09-07T00:00:00.000Z');
  const executedAt = (iso: string) => ({ latestExecutionAt: new Date(iso) });

  it('is active when any branch executed the test within the inactivity window', () => {
    expect(isActive([executedAt('2026-09-06T00:00:00.000Z')], to, 24)).toBe(true);
    expect(
      isActive(
        [executedAt('2026-09-01T00:00:00.000Z'), executedAt('2026-09-06T23:00:00.000Z')],
        to,
        24
      )
    ).toBe(true);
    expect(isActive([executedAt('2026-09-05T23:59:59.000Z')], to, 24)).toBe(false);
    expect(isActive([], to, 24)).toBe(false);
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

  /** Counts on `main` that clear the thresholds, with an execution right before the window end. */
  const mainCounts = (
    overrides: Partial<queries.BranchCountsRow> = {}
  ): queries.BranchCountsRow => ({
    branch: 'main',
    builds: 100,
    failedBuilds: 10,
    latestExecutionAt: new Date('2026-09-06T23:00:00.000Z'),
    ...overrides,
  });
  const qualifyingFlakiestBranch = {
    branch: 'main',
    builds: 100,
    failedBuilds: 10,
    buildFailRate: 0.1,
  };

  /** Branch counts where every test in `testIds` qualifies on `main` and is active. */
  const activeCounts = (testIds: string[]) =>
    new Map(testIds.map((testId) => [testId, [mainCounts()]]));

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
    });
    // the excluded classification never reaches the per-branch check either
    expect(fetchBranchCounts).toHaveBeenCalledWith(es, expect.anything(), [
      expect.objectContaining({ testId: 'jest-flaky' }),
    ]);
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
            // 9.5 never failed it, and only ever skipped it lately
            mainCounts({
              branch: '9.5',
              builds: 10,
              failedBuilds: 0,
              latestExecutionAt: new Date('2026-09-01T00:00:00.000Z'),
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
            filePath: 'a.test.ts',
            configPath: 'jest.config.js',
            owners: ['elastic/team'],
            areas: ['platform'],
          },
        ],
      ])
    );
    const fetchSampleFailures = jest.spyOn(queries, 'fetchSampleFailures').mockResolvedValue(
      new Map([
        [
          'jest-flaky-high',
          {
            suiteTitle: 'flaky suite',
            failures: [
              { message: 'boom', buildUrl: 'https://b/1', timestamp: new Date('2026-09-06') },
            ],
          },
        ],
      ])
    );
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
      .mockResolvedValue(new Map([['a.test.ts', pipelineStats]]));

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
    });

    // maxTests = 1 keeps only the highest ranked flaky test
    expect(report.flaky.map((entry) => entry.testId)).toEqual(['jest-flaky-high']);
    expect(report.flaky[0]).toMatchObject({
      framework: 'jest',
      title: 'flakes a lot',
      suiteTitle: 'flaky suite',
      filePath: 'a.test.ts',
      configPath: 'jest.config.js',
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
      sampleFailures: [{ message: 'boom', buildUrl: 'https://b/1' }],
    });

    expect(report.consistentlyFailing.map((entry) => entry.testId)).toEqual(['jest-broken']);
    expect(report.consistentlyFailing[0]).toMatchObject({
      title: '(unknown)',
      filePath: '(unknown)',
      owners: [],
      flakiestBranch: qualifyingFlakiestBranch,
      sampleFailures: [],
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
      )
    );

    // per-test lookups only run for admitted tests
    const admittedIds = ['jest-flaky-high', 'jest-broken'];
    const admitted = admittedIds.map((testId) =>
      expect.objectContaining({ testId, framework: 'jest' })
    );
    expect(fetchBranchStats).toHaveBeenCalledWith(es, expect.anything(), admitted);
    expect(fetchSampleFailures).toHaveBeenCalledWith(
      es,
      expect.anything(),
      admittedIds,
      options.samplesPerTest
    );
    expect(fetchFilePipelineStats).toHaveBeenCalledWith(es, expect.anything(), admitted);
  });

  it('checks thresholds per branch and activity before ranking, so the cap is filled with tests that qualify', async () => {
    jest.spyOn(queries, 'fetchFailingFiles').mockResolvedValue([
      { framework: 'jest', filePath: 'a.test.ts' },
      { framework: 'jest', filePath: 'b.test.ts' },
    ]);
    jest.spyOn(queries, 'fetchTestStats').mockResolvedValue([
      statsRow({ testId: 'skipped-since', failedBuilds: 30 }),
      // 12 of 1000 in total is 1.2%, above the 1% required, but spread thin over two branches
      statsRow({ testId: 'diluted', builds: 1000, failedBuilds: 12 }),
      // 6 of 600 in total is 1%; on 9.5 alone it is 5 of 100
      statsRow({ testId: 'flaky-on-9.5', builds: 600, failedBuilds: 6 }),
      statsRow({ testId: 'still-running', failedBuilds: 20 }),
    ]);
    // `skipped-since` and `diluted` outrank the others and would have taken the slots had the
    // checks happened after the cap
    const fetchBranchCounts = jest.spyOn(queries, 'fetchBranchCounts').mockResolvedValue(
      new Map([
        [
          'skipped-since',
          [
            mainCounts({
              failedBuilds: 30,
              latestExecutionAt: new Date('2026-09-05T00:00:00.000Z'),
            }),
          ],
        ],
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
      ['skipped-since', 'diluted', 'flaky-on-9.5', 'still-running'].map((testId) =>
        expect.objectContaining({ testId })
      )
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

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(es, options, log);

    expect(report.flaky).toEqual([]);
    expect(report.summary.totalFlaky).toBe(0);
    expect(fetchTestMetadata).not.toHaveBeenCalled();
    expect(fetchBranchStats).not.toHaveBeenCalled();
  });

  it('skips metadata, branch stats and sample queries when nothing qualifies', async () => {
    jest.spyOn(queries, 'fetchFailingFiles').mockResolvedValue([]);
    const fetchTestStats = jest.spyOn(queries, 'fetchTestStats');
    const fetchBranchCounts = jest.spyOn(queries, 'fetchBranchCounts');
    const fetchTestMetadata = jest.spyOn(queries, 'fetchTestMetadata');
    const fetchBranchStats = jest.spyOn(queries, 'fetchBranchStats');
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
      schemaVersion: 1,
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
    // likewise for the inactivity threshold and the per-file breakdown
    expect(report.thresholds.maxInactiveHours).toBe(24);
    expect(report.files).toEqual([]);

    const outputPath = path.join(tmpDir, 'nested', 'report.json');
    new ScoutFlakyTests(report).writeToFile(outputPath);

    expect(ScoutFlakyTests.fromFile(outputPath).data).toEqual(report);
  });
});
