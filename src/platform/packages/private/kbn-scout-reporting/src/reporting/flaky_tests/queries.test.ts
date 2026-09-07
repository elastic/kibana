/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildFailingFilesQuery,
  buildTestMetadataQuery,
  buildTestStatsQuery,
  fetchFailingFiles,
  fetchLatestRuns,
  fetchSampleFailures,
  fetchTestMetadata,
  fetchTestStats,
  quoteEsqlString,
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

describe('quoteEsqlString', () => {
  it('wraps the value in double quotes', () => {
    expect(quoteEsqlString('kibana-on-merge')).toBe('"kibana-on-merge"');
  });

  it('escapes backslashes and double quotes', () => {
    expect(quoteEsqlString('say "hi" \\ bye')).toBe('"say \\"hi\\" \\\\ bye"');
  });
});

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

describe('buildTestMetadataQuery', () => {
  it('reads descriptive fields from failure documents only', () => {
    const query = buildTestMetadataQuery(scope, ['ftr']);

    expect(query).toContain('test.status IN ("failed", "timedOut")');
    expect(query).toContain('title = MAX(test.title.keyword)');
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
        file_path: 'a.ts',
        config_path: 'a.config.ts',
        owners: 'elastic/team-a',
        areas: ['platform', 'security'],
      },
      { test_id: 't2', title: null, file_path: null, config_path: null, owners: null, areas: null },
    ]);

    const metadata = await fetchTestMetadata(client, scope, ['jest']);

    expect(metadata.get('t1')).toEqual({
      testId: 't1',
      title: 'does a thing',
      filePath: 'a.ts',
      configPath: 'a.config.ts',
      owners: ['elastic/team-a'],
      areas: ['platform', 'security'],
    });
    expect(metadata.get('t2')).toEqual({
      testId: 't2',
      title: undefined,
      filePath: undefined,
      configPath: undefined,
      owners: [],
      areas: [],
    });
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
                        buildkite: { build: { url: 'https://buildkite.com/b/1' } },
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
  });
});

describe('fetchLatestRuns', () => {
  const bucket = (key: string, source: object) => ({
    key,
    latest: { hits: { hits: [{ _source: source }] } },
  });

  it('returns an empty map without a search when there are no tests', async () => {
    const { client, search } = mockEs([]);

    await expect(fetchLatestRuns(client, scope, [])).resolves.toEqual(new Map());
    expect(search).not.toHaveBeenCalled();
  });

  it('reports the newest verdict per test, mapping Playwright retry passes to flaky', async () => {
    const { client, search } = mockEs([]);
    search.mockResolvedValue({
      aggregations: {
        by_test: {
          buckets: [
            bucket('skipped', {
              '@timestamp': '2026-09-07T10:00:00.000Z',
              test: { status: 'skipped', outcome: 'skipped' },
              buildkite: { branch: 'main', build: { url: 'https://buildkite.com/b/1' } },
            }),
            bucket('retried', {
              '@timestamp': '2026-09-07T09:00:00.000Z',
              test: { status: 'passed', outcome: 'flaky' },
            }),
            bucket('jest', {
              '@timestamp': '2026-09-07T08:00:00.000Z',
              test: { status: 'failed' },
            }),
          ],
        },
      },
    });

    // every test is found in the trailing day, so there is no fallback search
    const latest = await fetchLatestRuns(client, scope, ['skipped', 'retried', 'jest']);

    expect(latest.get('skipped')).toEqual({
      status: 'skipped',
      timestamp: new Date('2026-09-07T10:00:00.000Z'),
      branch: 'main',
      buildUrl: 'https://buildkite.com/b/1',
    });
    expect(latest.get('retried')).toMatchObject({ status: 'flaky', branch: undefined });
    expect(latest.get('jest')).toMatchObject({ status: 'failed' });

    expect(search).toHaveBeenCalledTimes(1);
    const [request] = search.mock.calls[0];
    expect(request.query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          range: { '@timestamp': { gte: '2026-09-06T00:00:00.000Z', lt: scope.to.toISOString() } },
        },
        { terms: { 'event.action': ['test-end', 'test-outcome'] } },
        { terms: { 'buildkite.pipeline.slug': ['kibana-on-merge'] } },
      ])
    );
    expect(request.aggs.by_test.aggs.latest.top_hits.size).toBe(1);
  });

  it('falls back to the full window for tests without a run in the trailing day', async () => {
    const { client, search } = mockEs([]);
    search
      .mockResolvedValueOnce({
        aggregations: {
          by_test: {
            buckets: [
              bucket('recent', {
                '@timestamp': '2026-09-07T10:00:00.000Z',
                test: { status: 'passed' },
              }),
              bucket('no-status', { '@timestamp': '2026-09-07T09:00:00.000Z' }),
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        aggregations: {
          by_test: {
            buckets: [
              bucket('stale', {
                '@timestamp': '2026-09-02T10:00:00.000Z',
                test: { status: 'skipped' },
              }),
            ],
          },
        },
      });

    const latest = await fetchLatestRuns(client, scope, ['recent', 'stale', 'no-status', 'gone']);

    expect(latest.get('recent')).toMatchObject({ status: 'passed' });
    expect(latest.get('stale')).toMatchObject({ status: 'skipped' });
    expect(latest.has('no-status')).toBe(false);
    expect(latest.has('gone')).toBe(false);

    expect(search).toHaveBeenCalledTimes(2);
    const [, [fallback]] = search.mock.calls;
    expect(fallback.query.bool.filter).toEqual(
      expect.arrayContaining([
        { range: { '@timestamp': { gte: scope.from.toISOString(), lt: scope.to.toISOString() } } },
        { terms: { 'test.id': ['stale', 'no-status', 'gone'] } },
      ])
    );
  });
});
