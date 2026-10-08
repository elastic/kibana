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
import { classifyTest, latestRunAcrossBranches, rankTests, ScoutFlakyTests } from './report';
import { DEFAULT_FLAKY_TEST_REPORT_OPTIONS, FlakyTestReportSchema } from './schema';
import * as queries from './queries';

const thresholds = { minBuilds: 10, minFailedBuilds: 2 };

describe('classifyTest', () => {
  it('ignores tests seen in too few builds', () => {
    expect(
      classifyTest({ runs: 9, fails: 5, retryFlakes: 0, builds: 9, failedBuilds: 5 }, thresholds)
    ).toBeUndefined();
  });

  it('ignores tests that failed in too few builds', () => {
    expect(
      classifyTest({ runs: 50, fails: 1, retryFlakes: 0, builds: 50, failedBuilds: 1 }, thresholds)
    ).toBeUndefined();
  });

  it('is flaky when the test also passed cleanly', () => {
    expect(
      classifyTest({ runs: 50, fails: 5, retryFlakes: 0, builds: 50, failedBuilds: 5 }, thresholds)
    ).toBe('flaky');
  });

  it('is flaky when every execution failed but some recovered on an in-run retry', () => {
    expect(
      classifyTest(
        { runs: 20, fails: 20, retryFlakes: 18, builds: 20, failedBuilds: 20 },
        thresholds
      )
    ).toBe('flaky');
  });

  it('is consistently failing when it never passed', () => {
    expect(
      classifyTest(
        { runs: 20, fails: 20, retryFlakes: 0, builds: 20, failedBuilds: 20 },
        thresholds
      )
    ).toBe('consistently-failing');
  });
});

describe('rankTests', () => {
  it('orders by failed builds, then build failure rate, then most recent failure', () => {
    const entries = [
      { id: 'a', failedBuilds: 2, buildFailRate: 0.5, lastFailedAt: new Date('2026-09-01') },
      { id: 'b', failedBuilds: 5, buildFailRate: 0.1, lastFailedAt: new Date('2026-09-01') },
      { id: 'c', failedBuilds: 2, buildFailRate: 0.5, lastFailedAt: new Date('2026-09-03') },
      { id: 'd', failedBuilds: 2, buildFailRate: 0.9, lastFailedAt: new Date('2026-09-01') },
    ];

    expect(rankTests(entries).map((entry) => entry.id)).toEqual(['b', 'd', 'c', 'a']);
    expect(entries.map((entry) => entry.id)).toEqual(['a', 'b', 'c', 'd']);
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
    const fetchBranchStats = jest.spyOn(queries, 'fetchBranchStats').mockResolvedValue(
      new Map([
        [
          'jest-flaky-high',
          [
            {
              branch: 'main',
              builds: 90,
              failedBuilds: 30,
              buildFailRate: 30 / 90,
              latestRun: { status: 'passed', timestamp: new Date('2026-09-06T06:00:00.000Z') },
            },
            {
              branch: '9.5',
              builds: 10,
              failedBuilds: 0,
              buildFailRate: 0,
              latestRun: { status: 'skipped', timestamp: new Date('2026-09-06T12:00:00.000Z') },
            },
          ],
        ],
      ])
    );

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
      filePath: 'a.test.ts',
      configPath: 'jest.config.js',
      owners: ['elastic/team'],
      passes: 90,
      buildFailRate: 0.3,
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
      byBranch: [],
      sampleFailures: [],
    });
    expect(report.consistentlyFailing[0].latestRun).toBeUndefined();

    // per-test lookups only run for admitted tests
    const admittedIds = ['jest-flaky-high', 'jest-broken'];
    expect(fetchBranchStats).toHaveBeenCalledWith(
      es,
      expect.anything(),
      admittedIds.map((testId) => expect.objectContaining({ testId, framework: 'jest' }))
    );
    expect(fetchSampleFailures).toHaveBeenCalledWith(
      es,
      expect.anything(),
      admittedIds,
      options.samplesPerTest
    );
  });

  it('skips metadata, branch stats and sample queries when nothing qualifies', async () => {
    jest.spyOn(queries, 'fetchFailingFiles').mockResolvedValue([]);
    const fetchTestStats = jest.spyOn(queries, 'fetchTestStats');
    const fetchTestMetadata = jest.spyOn(queries, 'fetchTestMetadata');
    const fetchBranchStats = jest.spyOn(queries, 'fetchBranchStats');
    const fetchSampleFailures = jest.spyOn(queries, 'fetchSampleFailures');

    const { data: report } = await ScoutFlakyTests.fromElasticsearch(es, options, log);

    expect(report.flaky).toEqual([]);
    expect(report.consistentlyFailing).toEqual([]);
    expect(fetchTestStats).not.toHaveBeenCalled();
    expect(fetchTestMetadata).not.toHaveBeenCalled();
    expect(fetchBranchStats).not.toHaveBeenCalled();
    expect(fetchSampleFailures).not.toHaveBeenCalled();
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

    const outputPath = path.join(tmpDir, 'nested', 'report.json');
    new ScoutFlakyTests(report).writeToFile(outputPath);

    expect(ScoutFlakyTests.fromFile(outputPath).data).toEqual(report);
  });
});
