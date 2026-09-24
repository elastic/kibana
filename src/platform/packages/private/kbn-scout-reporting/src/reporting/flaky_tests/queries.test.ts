/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_ROW_LIMIT } from './esql';
import {
  buildBranchStatsQuery,
  buildFailingFilesQuery,
  buildBranchCountsQuery,
  buildFilePipelineStatsQuery,
  buildTestMetadataQuery,
  buildTestStatsQuery,
  fetchBranchStats,
  fetchFailingFiles,
  fetchBranchCounts,
  fetchFilePipelineStats,
  fetchSampleFailures,
  fetchTargetStats,
  fetchTestErrors,
  fetchTestMetadata,
  fetchTestStats,
  fileStatsKey,
  buildTargetStatsQuery,
  buildTestErrorsQuery,
  type FlakyTestQueryScope,
} from './queries';

const scope: FlakyTestQueryScope = {
  from: new Date('2026-08-31T00:00:00.000Z'),
  to: new Date('2026-09-07T00:00:00.000Z'),
  pipelines: ['kibana-on-merge'],
  branches: [],
};

const mockEs = (records: unknown[]) => {
  const toRecords = jest.fn().mockResolvedValue({ records });
  const esql = jest.fn().mockReturnValue({ toRecords });
  const search = jest.fn();
  return { client: { helpers: { esql }, search } as any, esql, search };
};

describe('buildFailingFilesQuery', () => {
  it('scopes by window and pipelines and matches failures of every requested framework', () => {
    const query = buildFailingFilesQuery(scope, ['jest', 'ftr', 'cypress', 'playwright']);

    expect(query).toContain('@timestamp >= "2026-08-31T00:00:00.000Z"');
    expect(query).toContain('@timestamp < "2026-09-07T00:00:00.000Z"');
    expect(query).toContain('buildkite.pipeline.slug IN ("kibana-on-merge")');
    expect(query).toContain(
      '(event.action == "test-end" AND reporter.type IN ("jest", "ftr", "cypress") AND test.status IN ("failed", "timedOut"))'
    );
    expect(query).toContain(
      '(event.action == "test-outcome" AND reporter.type IN ("playwright") AND test.outcome IN ("unexpected", "flaky"))'
    );
    expect(query).toContain('STATS fails = COUNT(*) BY test.file.path, reporter.type');
    expect(query).not.toContain('buildkite.branch');
  });

  it('omits the pipeline filter when no pipelines are given and adds a branch filter when given', () => {
    const query = buildFailingFilesQuery({ ...scope, pipelines: [], branches: ['main', '9.4'] }, [
      'jest',
    ]);

    expect(query).not.toContain('buildkite.pipeline.slug');
    expect(query).toContain('buildkite.branch IN ("main", "9.4")');
    expect(query).not.toContain('test-outcome');
  });
});

describe('buildTestStatsQuery', () => {
  it('counts one execution per test-end for Jest, FTR and Cypress', () => {
    const query = buildTestStatsQuery(scope, 'jest', ['a/b.test.ts', 'c/d.test.ts']);

    expect(query).toContain(
      'event.action == "test-end" AND reporter.type IN ("jest") AND test.status IN ("passed", "failed", "timedOut")'
    );
    expect(query).toContain('test.file.path IN ("a/b.test.ts", "c/d.test.ts")');
    expect(query).toContain(
      'EVAL failed = CASE(test.status IN ("failed", "timedOut"), 1, 0), retry_flake = 0'
    );
    expect(query).toContain('BY test.id, reporter.type');
    expect(query).toContain('| WHERE fails > 0');
  });

  it('counts one execution per test-outcome for Playwright and tracks in-run retries', () => {
    const query = buildTestStatsQuery(scope, 'playwright', ['x.spec.ts']);

    expect(query).toContain(
      'event.action == "test-outcome" AND reporter.type IN ("playwright") AND test.outcome IN ("expected", "unexpected", "flaky")'
    );
    expect(query).toContain(
      'EVAL failed = CASE(test.outcome IN ("unexpected", "flaky"), 1, 0), retry_flake = CASE(test.outcome == "flaky", 1, 0)'
    );
    expect(query).not.toContain('test-end');
  });
});

describe('buildBranchStatsQuery', () => {
  it('counts executions and reads the latest run per test and branch for the given tests only', () => {
    const query = buildBranchStatsQuery(scope, ['jest', 'ftr'], ['t1', 't2']);

    // every run document is scanned, whatever its status, so that the latest run can be a skipped one...
    expect(query).toContain(
      '(event.action == "test-end" AND reporter.type IN ("jest", "ftr")) AND test.id IN ("t1", "t2")'
    );
    // ...while only executions count towards builds
    expect(query).toContain(
      'EVAL is_execution = CASE((event.action == "test-end" AND reporter.type IN ("jest", "ftr") AND test.status IN ("passed", "failed", "timedOut")), 1, 0)'
    );
    expect(query).toContain(
      'failed = CASE(is_execution == 1 AND CASE(test.status IN ("failed", "timedOut"), 1, 0) == 1, 1, 0)'
    );
    expect(query).toContain(
      'status = CASE(test.outcome == "flaky", "flaky", test.outcome == "skipped", "skipped", test.status)'
    );
    expect(query).toContain(
      'builds = COUNT_DISTINCT(CASE(is_execution == 1, buildkite.build.id, NULL))'
    );
    expect(query).toContain(
      'last_failed_at = MAX(CASE(failed == 1, @timestamp, NULL)), ' +
        'last_failed_build_url = LAST(buildkite.build.url, @timestamp) WHERE failed == 1, ' +
        'last_failed_job_id = LAST(buildkite.job_id, @timestamp) WHERE failed == 1, ' +
        'latest_execution_at = MAX(CASE(is_execution == 1, @timestamp, NULL)), ' +
        'latest_status = LAST(status, @timestamp), latest_at = MAX(@timestamp), ' +
        'latest_build_url = LAST(buildkite.build.url, @timestamp), ' +
        'latest_job_id = LAST(buildkite.job_id, @timestamp)'
    );
    expect(query).toContain('BY test.id, buildkite.branch');
    expect(query).toContain('RENAME test.id AS test_id, buildkite.branch AS branch');
  });

  it('scans only per-run outcome documents for Playwright', () => {
    const query = buildBranchStatsQuery(scope, ['playwright'], ['p1']);

    expect(query).toContain(
      '(event.action == "test-outcome" AND reporter.type IN ("playwright")) AND test.id IN ("p1")'
    );
    expect(query).toContain(
      'is_execution = CASE((event.action == "test-outcome" AND reporter.type IN ("playwright") AND test.outcome IN ("expected", "unexpected", "flaky")), 1, 0)'
    );
    expect(query).not.toContain('test-end');
  });
});

describe('fetchBranchStats', () => {
  it('returns an empty map without a query when there are no tests', async () => {
    const { client, esql } = mockEs([]);

    expect(await fetchBranchStats(client, scope, [])).toEqual(new Map());
    expect(esql).not.toHaveBeenCalled();
  });

  it('queries once per execution model and sorts branches by failed builds', async () => {
    const { client, esql } = mockEs([]);
    const latest = (
      status: string | null,
      at: string | null,
      url: string | null = null,
      executionAt: string | null = at
    ) => ({
      latest_execution_at: executionAt,
      latest_status: status,
      latest_at: at,
      latest_build_url: url,
    });
    const attemptRows = [
      {
        test_id: 'j1',
        branch: 'main',
        builds: 40,
        failed_builds: 2,
        last_failed_at: '2026-09-05T00:00:00.000Z',
        ...latest('skipped', '2026-09-06T12:00:00.000Z', 'https://b/9', '2026-09-05T00:00:00.000Z'),
      },
      {
        test_id: 'j1',
        branch: '9.5',
        builds: 8,
        failed_builds: 3,
        last_failed_at: '2026-09-06T00:00:00.000Z',
        ...latest('passed', '2026-09-06T06:00:00.000Z', ''),
      },
      {
        test_id: 'j1',
        branch: '9.4',
        builds: 5,
        failed_builds: 0,
        last_failed_at: null,
        ...latest(null, null),
      },
      {
        test_id: 'j1',
        branch: null,
        builds: 1,
        failed_builds: 1,
        last_failed_at: null,
        ...latest('failed', '2026-09-06T00:00:00.000Z'),
      },
    ];
    const outcomeRows = [
      {
        test_id: 'p1',
        branch: 'main',
        builds: 10,
        failed_builds: 5,
        last_failed_at: '2026-09-06T00:00:00.000Z',
        last_failed_build_url: 'https://b/1',
        last_failed_job_id: 'job-1',
        ...latest('flaky', '2026-09-06T00:00:00.000Z', 'https://b/1'),
        latest_job_id: 'job-1',
      },
    ];
    esql
      .mockReturnValueOnce({ toRecords: jest.fn().mockResolvedValue({ records: attemptRows }) })
      .mockReturnValueOnce({ toRecords: jest.fn().mockResolvedValue({ records: outcomeRows }) });

    const stats = await fetchBranchStats(client, scope, [
      { testId: 'j1', framework: 'jest' },
      { testId: 'f1', framework: 'ftr' },
      { testId: 'p1', framework: 'playwright' },
    ]);

    expect(esql).toHaveBeenCalledTimes(2);
    const queries = esql.mock.calls.map(([{ query }]) => query as string);
    expect(queries[0]).toContain('reporter.type IN ("jest", "ftr")');
    expect(queries[0]).toContain('test.id IN ("j1", "f1")');
    expect(queries[1]).toContain('reporter.type IN ("playwright")');
    expect(queries[1]).toContain('test.id IN ("p1")');

    // rows without a branch are dropped; a branch without a latest status has no latest run
    expect(stats.get('j1')).toEqual([
      {
        branch: '9.5',
        builds: 8,
        failedBuilds: 3,
        buildFailRate: 0.375,
        lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
        latestExecutionAt: new Date('2026-09-06T06:00:00.000Z'),
        latestRun: {
          status: 'passed',
          timestamp: new Date('2026-09-06T06:00:00.000Z'),
          buildUrl: undefined,
        },
      },
      {
        branch: 'main',
        builds: 40,
        failedBuilds: 2,
        buildFailRate: 0.05,
        lastFailedAt: new Date('2026-09-05T00:00:00.000Z'),
        latestExecutionAt: new Date('2026-09-05T00:00:00.000Z'),
        latestRun: {
          status: 'skipped',
          timestamp: new Date('2026-09-06T12:00:00.000Z'),
          buildUrl: 'https://b/9',
        },
      },
      {
        branch: '9.4',
        builds: 5,
        failedBuilds: 0,
        buildFailRate: 0,
        lastFailedAt: undefined,
        latestExecutionAt: undefined,
        latestRun: undefined,
      },
    ]);
    expect(stats.get('p1')).toEqual([
      {
        branch: 'main',
        builds: 10,
        failedBuilds: 5,
        buildFailRate: 0.5,
        lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
        lastFailedBuildUrl: 'https://b/1',
        lastFailedJobId: 'job-1',
        latestExecutionAt: new Date('2026-09-06T00:00:00.000Z'),
        latestRun: {
          status: 'flaky',
          timestamp: new Date('2026-09-06T00:00:00.000Z'),
          buildUrl: 'https://b/1',
          jobId: 'job-1',
        },
      },
    ]);
    expect(stats.has('f1')).toBe(false);
  });
});

const countThresholds = { minBuilds: 10, minFailedBuilds: 2 };

describe('buildBranchCountsQuery', () => {
  it('counts builds per test and branch for the given tests, keeping only branches that clear the count thresholds', () => {
    const query = buildBranchCountsQuery(scope, ['jest', 'ftr'], ['j1', 'f1'], countThresholds);

    expect(query).toContain('@timestamp >= "2026-08-31T00:00:00.000Z"');
    expect(query).toContain('buildkite.pipeline.slug IN ("kibana-on-merge")');
    expect(query).toContain(
      '(event.action == "test-end" AND reporter.type IN ("jest", "ftr") AND test.status IN ("passed", "failed", "timedOut")) AND test.id IN ("j1", "f1")'
    );
    expect(query).toContain('EVAL failed = CASE(test.status IN ("failed", "timedOut"), 1, 0)');
    expect(query).toContain(
      'STATS builds = COUNT_DISTINCT(buildkite.build.id), ' +
        'failed_builds = COUNT_DISTINCT(CASE(failed == 1, buildkite.build.id, NULL)) ' +
        'BY test.id, buildkite.branch | WHERE builds >= 10 AND failed_builds >= 2'
    );
    expect(query).toContain('RENAME test.id AS test_id, buildkite.branch AS branch');
    // no LAST: the latest run is left to the branch stats query
    expect(query).not.toContain('LAST(');
    expect(query).not.toContain('latest_execution_at');
  });
});

describe('fetchBranchCounts', () => {
  const tests = [
    { testId: 'j1', framework: 'jest' as const },
    { testId: 'p1', framework: 'playwright' as const },
  ];

  it('returns an empty map without a query when there are no tests', async () => {
    const { client, esql } = mockEs([]);

    expect(await fetchBranchCounts(client, scope, [], countThresholds)).toEqual(new Map());
    expect(esql).not.toHaveBeenCalled();
  });

  it('queries once per execution model and keys the rows by test, most failed builds first', async () => {
    const { client, esql } = mockEs([]);
    esql
      .mockReturnValueOnce({
        toRecords: jest.fn().mockResolvedValue({
          records: [
            {
              test_id: 'j1',
              branch: '9.5',
              builds: 100,
              failed_builds: 8,
            },
            {
              test_id: 'j1',
              branch: 'main',
              builds: 500,
              failed_builds: 10,
            },
            // no branch: ignored
            { test_id: 'j1', branch: null, builds: 1, failed_builds: 1 },
          ],
        }),
      })
      .mockReturnValueOnce({ toRecords: jest.fn().mockResolvedValue({ records: [] }) });

    const counts = await fetchBranchCounts(client, scope, tests, countThresholds);

    expect(esql).toHaveBeenCalledTimes(2);
    const queries = esql.mock.calls.map(([{ query }]) => query as string);
    expect(queries[0]).toContain('test.id IN ("j1")');
    expect(queries[1]).toContain('test.id IN ("p1")');

    expect(counts.get('j1')).toEqual([
      {
        branch: 'main',
        builds: 500,
        failedBuilds: 10,
      },
      {
        branch: '9.5',
        builds: 100,
        failedBuilds: 8,
      },
    ]);
    // a test without any row is absent
    expect(counts.has('p1')).toBe(false);
  });

  it('fails when the result hits the row limit, as the cut-off tests would pass for disqualified', async () => {
    const { client } = mockEs(
      Array.from({ length: ESQL_ROW_LIMIT }, () => ({
        test_id: 'j1',
        branch: 'main',
        builds: 20,
        failed_builds: 2,
      }))
    );

    await expect(
      fetchBranchCounts(client, scope, tests.slice(0, 1), countThresholds)
    ).rejects.toThrow(`Per-branch counts query hit the ${ESQL_ROW_LIMIT} row limit`);
  });
});

describe('buildTestMetadataQuery', () => {
  it('reads descriptive fields from failure documents only', () => {
    const query = buildTestMetadataQuery(scope, ['ftr']);

    expect(query).toContain('test.status IN ("failed", "timedOut")');
    expect(query).toContain('title = MAX(test.title.keyword)');
    expect(query).toContain('config_category = MAX(test_run.config.category)');
    expect(query).toContain('suite_title = MAX(suite.title.keyword)');
    expect(query).toContain('owners = VALUES(test.file.owner)');
    expect(query).toContain('BY test.id');
  });
});

describe('fetchFailingFiles', () => {
  it('drops rows without a file path or outside the requested frameworks', async () => {
    const { client } = mockEs([
      { file_path: 'a.test.ts', framework: 'jest' },
      { file_path: null, framework: 'jest' },
      { file_path: 'b.spec.ts', framework: 'playwright' },
    ]);

    await expect(fetchFailingFiles(client, scope, ['jest'])).resolves.toEqual([
      { framework: 'jest', filePath: 'a.test.ts' },
    ]);
  });
});

describe('fetchTestStats', () => {
  it('returns no rows and issues no query without file paths', async () => {
    const { client, esql } = mockEs([]);

    await expect(fetchTestStats(client, scope, 'jest', [])).resolves.toEqual([]);
    expect(esql).not.toHaveBeenCalled();
  });

  it('maps ES|QL columns to typed rows', async () => {
    const { client } = mockEs([
      {
        test_id: 't1',
        framework: 'ftr',
        runs: 10,
        fails: 2,
        retry_flakes: 0,
        builds: 9,
        failed_builds: 2,
        failed_branches: 1,
        first_failed_at: '2026-09-01T00:00:00.000Z',
        last_failed_at: '2026-09-02T00:00:00.000Z',
      },
    ]);

    const [row] = await fetchTestStats(client, scope, 'ftr', ['f.ts']);
    expect(row).toEqual({
      testId: 't1',
      framework: 'ftr',
      runs: 10,
      fails: 2,
      retryFlakes: 0,
      builds: 9,
      failedBuilds: 2,
      failedBranches: 1,
      firstFailedAt: new Date('2026-09-01T00:00:00.000Z'),
      lastFailedAt: new Date('2026-09-02T00:00:00.000Z'),
    });
  });
});

describe('fetchTestMetadata', () => {
  it('normalises single and multi-valued owner fields to arrays', async () => {
    const { client } = mockEs([
      {
        test_id: 't1',
        title: 'does a thing',
        suite_title: 'my suite',
        file_path: 'a.ts',
        config_path: 'a.config.ts',
        config_category: 'api-test',
        owners: 'elastic/team-a',
        areas: ['platform', 'security'],
      },
      {
        test_id: 't2',
        title: null,
        suite_title: null,
        file_path: null,
        config_path: null,
        config_category: null,
        owners: null,
        areas: null,
      },
    ]);

    const metadata = await fetchTestMetadata(client, scope, ['jest']);

    expect(metadata.get('t1')).toEqual({
      testId: 't1',
      title: 'does a thing',
      suiteTitle: 'my suite',
      filePath: 'a.ts',
      configPath: 'a.config.ts',
      configCategory: 'api-test',
      owners: ['elastic/team-a'],
      areas: ['platform', 'security'],
    });
    expect(metadata.get('t2')).toEqual({
      testId: 't2',
      title: undefined,
      suiteTitle: undefined,
      filePath: undefined,
      configPath: undefined,
      configCategory: undefined,
      owners: [],
      areas: [],
    });
  });

  it('treats the suite title the Jest reporter writes for tests outside any describe block as absent', async () => {
    const { client } = mockEs([
      {
        test_id: 't1',
        title: 'top-level test',
        suite_title: 'unknown',
        file_path: 'a.test.ts',
        config_path: null,
        owners: null,
        areas: null,
      },
    ]);

    const metadata = await fetchTestMetadata(client, scope, ['jest']);

    expect(metadata.get('t1')?.suiteTitle).toBeUndefined();
  });
});

describe('fetchSampleFailures', () => {
  it('returns an empty map without a search when there is nothing to sample', async () => {
    const { client, search } = mockEs([]);

    await expect(fetchSampleFailures(client, scope, [], 3)).resolves.toEqual(new Map());
    await expect(fetchSampleFailures(client, scope, ['t1'], 0)).resolves.toEqual(new Map());
    expect(search).not.toHaveBeenCalled();
  });

  it('groups the latest attempt failures per test and skips hits without a message', async () => {
    const { client, search } = mockEs([]);
    search.mockResolvedValue({
      aggregations: {
        by_test: {
          buckets: [
            {
              key: 't1',
              latest: {
                hits: {
                  hits: [
                    {
                      _source: {
                        '@timestamp': '2026-09-02T00:00:00.000Z',
                        event: { error: { message: '  boom  ' } },
                        buildkite: {
                          build: { url: 'https://buildkite.com/b/1' },
                          job_id: 'job-1',
                          step: { label: 'FTR Configs #3' },
                        },
                      },
                    },
                    { _source: { '@timestamp': '2026-09-01T00:00:00.000Z', event: { error: {} } } },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    const samples = await fetchSampleFailures(client, scope, ['t1', 't2'], 3);

    expect(samples.get('t1')).toEqual([
      {
        message: 'boom',
        buildUrl: 'https://buildkite.com/b/1',
        jobId: 'job-1',
        stepLabel: 'FTR Configs #3',
        timestamp: new Date('2026-09-02T00:00:00.000Z'),
      },
    ]);
    expect(samples.has('t2')).toBe(false);

    const [request] = search.mock.calls[0];
    expect(request.query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { 'event.action': 'test-end' } },
        { terms: { 'test.status': ['failed', 'timedOut'] } },
        { terms: { 'test.id': ['t1', 't2'] } },
        { terms: { 'buildkite.pipeline.slug': ['kibana-on-merge'] } },
      ])
    );
    expect(request.aggs.by_test.terms.size).toBe(2);
    expect(request.aggs.by_test.aggs.latest.top_hits.size).toBe(3);
    expect(request.aggs.by_test.aggs.latest.top_hits._source).toEqual([
      '@timestamp',
      'event.error.message',
      'buildkite.build.url',
      'buildkite.job_id',
      'buildkite.step.label',
    ]);
  });
});

describe('buildTargetStatsQuery', () => {
  it('counts builds per test and target for the given tests, within the report scope', () => {
    const query = buildTargetStatsQuery(scope, ['jest', 'ftr'], ['t1', 't2']);

    expect(query).toContain('buildkite.pipeline.slug IN ("kibana-on-merge")');
    expect(query).toContain(
      '(event.action == "test-end" AND reporter.type IN ("jest", "ftr") AND test.status IN ("passed", "failed", "timedOut")) AND test.id IN ("t1", "t2")'
    );
    // a document missing the target fields is grouped with the `unknown` target the reporters write
    expect(query).toContain(
      'target_mode = COALESCE(test_run.target.mode, "unknown"), ' +
        'target_type = COALESCE(test_run.target.type, "unknown")'
    );
    expect(query).toContain(
      'STATS builds = COUNT_DISTINCT(buildkite.build.id), ' +
        'failed_builds = COUNT_DISTINCT(CASE(failed == 1, buildkite.build.id, NULL)), ' +
        'last_failed_at = MAX(CASE(failed == 1, @timestamp, NULL)), ' +
        'last_failed_build_url = LAST(buildkite.build.url, @timestamp) WHERE failed == 1, ' +
        'last_failed_job_id = LAST(buildkite.job_id, @timestamp) WHERE failed == 1 ' +
        'BY test.id, target_mode, target_type'
    );
    expect(query).toContain('RENAME test.id AS test_id');
  });
});

describe('fetchTargetStats', () => {
  it('returns an empty map without a query when there are no tests', async () => {
    const { client, esql } = mockEs([]);

    expect(await fetchTargetStats(client, scope, [])).toEqual(new Map());
    expect(esql).not.toHaveBeenCalled();
  });

  it('queries once per execution model and keys the rows by test, most failed builds first', async () => {
    const { client, esql } = mockEs([]);
    esql
      .mockReturnValueOnce({
        toRecords: jest.fn().mockResolvedValue({
          records: [
            {
              test_id: 'j1',
              target_mode: 'unknown',
              target_type: 'local',
              builds: 40,
              failed_builds: 2,
              last_failed_at: '2026-09-05T00:00:00.000Z',
            },
          ],
        }),
      })
      .mockReturnValueOnce({
        toRecords: jest.fn().mockResolvedValue({
          records: [
            {
              test_id: 'p1',
              target_mode: 'stateful-classic',
              target_type: 'local',
              builds: 30,
              failed_builds: 0,
              last_failed_at: null,
            },
            {
              test_id: 'p1',
              target_mode: 'serverless-security_complete',
              target_type: 'local',
              builds: 20,
              failed_builds: 5,
              last_failed_at: '2026-09-06T00:00:00.000Z',
              last_failed_build_url: 'https://b/7',
              last_failed_job_id: 'job-7',
            },
          ],
        }),
      });

    const stats = await fetchTargetStats(client, scope, [
      { testId: 'j1', framework: 'jest' },
      { testId: 'p1', framework: 'playwright' },
    ]);

    expect(esql).toHaveBeenCalledTimes(2);
    const queries = esql.mock.calls.map(([{ query }]) => query as string);
    expect(queries[0]).toContain('reporter.type IN ("jest")');
    expect(queries[0]).toContain('test.id IN ("j1")');
    expect(queries[1]).toContain('reporter.type IN ("playwright")');
    expect(queries[1]).toContain('test.id IN ("p1")');

    expect(stats.get('j1')).toEqual([
      {
        mode: 'unknown',
        type: 'local',
        builds: 40,
        failedBuilds: 2,
        buildFailRate: 0.05,
        lastFailedAt: new Date('2026-09-05T00:00:00.000Z'),
      },
    ]);
    expect(stats.get('p1')).toEqual([
      {
        mode: 'serverless-security_complete',
        type: 'local',
        builds: 20,
        failedBuilds: 5,
        buildFailRate: 0.25,
        lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
        lastFailedBuildUrl: 'https://b/7',
        lastFailedJobId: 'job-7',
      },
      {
        mode: 'stateful-classic',
        type: 'local',
        builds: 30,
        failedBuilds: 0,
        buildFailRate: 0,
        lastFailedAt: undefined,
      },
    ]);
  });
});

describe('buildTestErrorsQuery', () => {
  it('groups attempt failures with a message by test, normalised head and pipeline, across every pipeline and branch', () => {
    const query = buildTestErrorsQuery(scope, ['jest', 'playwright'], ['j1', 'p1']);

    expect(query).not.toContain('buildkite.pipeline.slug IN');
    expect(query).toContain(
      'event.action == "test-end" AND reporter.type IN ("jest", "playwright") AND ' +
        'test.status IN ("failed", "timedOut") AND event.error.message IS NOT NULL AND TRIM(event.error.message) != "" AND test.id IN ("j1", "p1")'
    );
    // three lines, then ids, URLs and numbers normalised
    expect(query).toContain(
      'head = REPLACE(REPLACE(REPLACE(LEFT(CONCAT(MV_FIRST(lines), "\\n", COALESCE(MV_SLICE(lines, 1, 1), ""), "\\n", COALESCE(MV_SLICE(lines, 2, 2), "")), 300), ' +
        '"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "ID"), "https?://[^ \\n]+", "URL"), "[0-9]+", "N")'
    );
    expect(query).toContain('message = LEFT(event.error.message, 12000)');
    expect(query).toContain(
      'message = LAST(message, @timestamp) BY test.id, head, buildkite.pipeline.slug'
    );
    expect(query).toContain('RENAME test.id AS test_id, buildkite.pipeline.slug AS pipeline');
  });
});

describe('fetchTestErrors', () => {
  const row = (overrides: Record<string, unknown>) => ({
    test_id: 't1',
    head: 'Error: boom N',
    pipeline: 'kibana-on-merge',
    failures: 1,
    builds: 1,
    branches: 'main',
    targets: 'stateful-classic',
    first_failed_at: '2026-09-02T00:00:00.000Z',
    last_failed_at: '2026-09-02T00:00:00.000Z',
    last_failed_build_url: 'https://b/1',
    last_failed_job_id: 'job-1',
    message: 'Error: boom 1',
    ...overrides,
  });

  it('returns an empty map without a query when there are no tests', async () => {
    const { client, esql } = mockEs([]);

    expect(await fetchTestErrors(client, scope, [])).toEqual(new Map());
    expect(esql).not.toHaveBeenCalled();
  });

  it('fails when the result hits the row limit, as the cut-off rows would pass for complete totals', async () => {
    const { client } = mockEs(
      Array.from({ length: ESQL_ROW_LIMIT }, (_, i) => row({ head: `e${i}` }))
    );

    await expect(
      fetchTestErrors(client, scope, [{ testId: 't1', framework: 'jest' }])
    ).rejects.toThrow(`Distinct errors query hit the ${ESQL_ROW_LIMIT} row limit`);
  });

  it('folds the per-pipeline rows of an error, newest message and build first, most failures first', async () => {
    const { client } = mockEs([
      row({ pipeline: 'kibana-on-merge', failures: 3, builds: 3, branches: ['main', '9.5'] }),
      row({
        pipeline: 'kibana-pull-request',
        failures: 5,
        builds: 4,
        branches: ['a:x', 'b:y'],
        targets: ['stateful-classic', 'serverless-search'],
        first_failed_at: '2026-09-01T00:00:00.000Z',
        last_failed_at: '2026-09-06T00:00:00.000Z',
        last_failed_build_url: 'https://b/9',
        last_failed_job_id: 'job-9',
        message: 'Error: boom 9',
      }),
      row({ head: 'TypeError: nope', failures: 1, builds: 1, message: 'TypeError: nope' }),
      // a row without a head cannot be grouped
      row({ head: null }),
      row({ test_id: 't2', head: 'Other', message: 'Other', last_failed_build_url: null }),
    ]);

    const errors = await fetchTestErrors(client, scope, [
      { testId: 't1', framework: 'jest' },
      { testId: 't2', framework: 'ftr' },
    ]);

    expect(errors.get('t1')).toEqual([
      {
        key: 'Error: boom N',
        message: 'Error: boom 9',
        failures: 8,
        builds: 7,
        byPipeline: [
          { pipeline: 'kibana-pull-request', failures: 5 },
          { pipeline: 'kibana-on-merge', failures: 3 },
        ],
        branches: ['9.5', 'a:x', 'b:y', 'main'],
        targets: ['serverless-search', 'stateful-classic'],
        firstFailedAt: new Date('2026-09-01T00:00:00.000Z'),
        lastFailedAt: new Date('2026-09-06T00:00:00.000Z'),
        lastFailedBuildUrl: 'https://b/9',
        lastFailedJobId: 'job-9',
      },
      expect.objectContaining({ key: 'TypeError: nope', failures: 1 }),
    ]);
    expect(errors.get('t2')).toEqual([
      expect.objectContaining({ key: 'Other', lastFailedBuildUrl: undefined }),
    ]);
  });
});

describe('buildFilePipelineStatsQuery', () => {
  it('groups by file and pipeline across every pipeline and branch of the window', () => {
    const query = buildFilePipelineStatsQuery(scope, ['jest', 'ftr'], ['j1']);

    expect(query).toContain('@timestamp >= "2026-08-31T00:00:00.000Z"');
    expect(query).not.toContain('buildkite.pipeline.slug IN');
    expect(query).not.toContain('buildkite.branch IN');
    expect(query).toContain('test.id IN ("j1")');
    expect(query).toContain(
      'failed_branches = COUNT_DISTINCT(CASE(failed == 1, buildkite.branch, NULL)), ' +
        'failed_branch_names = VALUES(CASE(failed == 1, buildkite.branch, NULL)), ' +
        'last_failed_at = MAX(CASE(failed == 1, @timestamp, NULL)), ' +
        'last_failed_build_url = LAST(buildkite.build.url, @timestamp) WHERE failed == 1, ' +
        'last_failed_job_id = LAST(buildkite.job_id, @timestamp) WHERE failed == 1, ' +
        'last_failed_step_label = LAST(buildkite.step.label, @timestamp) WHERE failed == 1 ' +
        'BY test.file.path, reporter.type, buildkite.pipeline.slug'
    );
    expect(query).toContain('WHERE failed_builds > 0');
    expect(query).toContain(
      'RENAME test.file.path AS file_path, reporter.type AS framework, buildkite.pipeline.slug AS pipeline'
    );
  });
});

describe('fetchFilePipelineStats', () => {
  it('returns an empty map without a query when there are no tests', async () => {
    const { client, esql } = mockEs([]);

    expect(await fetchFilePipelineStats(client, scope, [])).toEqual(new Map());
    expect(esql).not.toHaveBeenCalled();
  });

  it('keys pipeline rows by framework and file, most failed builds first, with the last failed build and job', async () => {
    const { client } = mockEs([
      {
        file_path: 'a.test.ts',
        framework: 'jest',
        pipeline: 'kibana-pull-request',
        builds: 700,
        failed_builds: 140,
        failed_branches: 100,
        failed_branch_names: ['someone:fix-it', 'main', 'else:feature'],
        last_failed_at: '2026-09-06T08:00:00.000Z',
        last_failed_build_url: 'https://buildkite.com/elastic/kibana-pull-request/builds/499472',
        last_failed_job_id: 'job-1',
        last_failed_step_label: 'Jest Tests #3',
      },
      {
        file_path: 'a.test.ts',
        framework: 'jest',
        pipeline: 'kibana-on-merge',
        builds: 500,
        failed_builds: 98,
        failed_branches: 1,
        failed_branch_names: 'main',
        last_failed_at: '2026-09-06T09:00:00.000Z',
        last_failed_build_url: null,
        last_failed_job_id: null,
        last_failed_step_label: null,
      },
      {
        file_path: null,
        framework: 'jest',
        pipeline: 'x',
        builds: 1,
        failed_builds: 1,
        failed_branches: 1,
      },
    ]);

    const stats = await fetchFilePipelineStats(client, scope, [
      { testId: 'j1', framework: 'jest' },
    ]);

    expect([...stats.keys()]).toEqual([fileStatsKey('jest', 'a.test.ts')]);
    expect(stats.get(fileStatsKey('jest', 'a.test.ts'))).toEqual([
      {
        pipeline: 'kibana-pull-request',
        builds: 700,
        failedBuilds: 140,
        buildFailRate: 0.2,
        failedBranches: 100,
        failedBranchNames: ['else:feature', 'main', 'someone:fix-it'],
        lastFailedAt: new Date('2026-09-06T08:00:00.000Z'),
        lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-pull-request/builds/499472',
        lastFailedJobId: 'job-1',
        lastFailedStepLabel: 'Jest Tests #3',
      },
      {
        pipeline: 'kibana-on-merge',
        builds: 500,
        failedBuilds: 98,
        buildFailRate: 0.196,
        failedBranches: 1,
        failedBranchNames: ['main'],
        lastFailedAt: new Date('2026-09-06T09:00:00.000Z'),
        lastFailedBuildUrl: undefined,
        lastFailedJobId: undefined,
        lastFailedStepLabel: undefined,
      },
    ]);
  });

  it('keeps the frameworks apart when they share a file path, within and across execution models', async () => {
    const row = (framework: string, failedBuilds: number) => ({
      file_path: 'shared.ts',
      framework,
      pipeline: 'kibana-on-merge',
      builds: 100,
      failed_builds: failedBuilds,
      failed_branches: 1,
      failed_branch_names: null,
      last_failed_at: null,
      last_failed_build_url: null,
      last_failed_job_id: null,
      last_failed_step_label: null,
    });
    const { client, esql } = mockEs([]);
    esql
      // jest and ftr share one query; each gets its own row for the path
      .mockReturnValueOnce({
        toRecords: jest.fn().mockResolvedValue({ records: [row('jest', 5), row('ftr', 7)] }),
      })
      .mockReturnValueOnce({
        toRecords: jest.fn().mockResolvedValue({ records: [row('playwright', 9)] }),
      });

    const stats = await fetchFilePipelineStats(client, scope, [
      { testId: 'j1', framework: 'jest' },
      { testId: 'f1', framework: 'ftr' },
      { testId: 'p1', framework: 'playwright' },
    ]);

    expect([...stats.keys()]).toEqual([
      fileStatsKey('jest', 'shared.ts'),
      fileStatsKey('ftr', 'shared.ts'),
      fileStatsKey('playwright', 'shared.ts'),
    ]);
    expect(stats.get(fileStatsKey('jest', 'shared.ts'))?.map((s) => s.failedBuilds)).toEqual([5]);
    expect(stats.get(fileStatsKey('ftr', 'shared.ts'))?.map((s) => s.failedBuilds)).toEqual([7]);
    expect(stats.get(fileStatsKey('playwright', 'shared.ts'))?.map((s) => s.failedBuilds)).toEqual([
      9,
    ]);
  });
});
