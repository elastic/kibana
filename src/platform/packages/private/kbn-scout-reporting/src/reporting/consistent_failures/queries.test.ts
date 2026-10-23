/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_ROW_LIMIT } from '../flaky_tests/esql';
import { buildRecentRunsQuery, fetchRecentRuns, type RecentRunsScope } from './queries';

const scope: RecentRunsScope = {
  pipeline: 'kibana-on-merge',
  branch: 'main',
  since: new Date('2026-10-13T00:00:00.000Z'),
};

const mockEs = (records: unknown[]) => {
  const toRecords = jest.fn().mockResolvedValue({ records });
  const esql = jest.fn().mockReturnValue({ toRecords });
  return { client: { helpers: { esql } } as any, esql };
};

const row = (overrides: Record<string, unknown>) => ({
  test_id: 'test-1',
  config_path: 'x-pack/test/scout/ui/playwright.config.ts',
  target_mode: 'stateful-classic',
  target_type: 'local',
  build: 1,
  passed: 1,
  failed: 0,
  recovered: 0,
  skipped: 0,
  attempts: null,
  last_at: '2026-10-16T10:00:00.000Z',
  build_url: 'https://buildkite.com/elastic/kibana-on-merge/builds/1',
  commit: 'abc',
  suite_title: 'Discover',
  config_category: 'ui-test',
  ...overrides,
});

describe('buildRecentRunsQuery', () => {
  it('scopes to the pipeline and branch since the given time, for the given tests', () => {
    const query = buildRecentRunsQuery(scope, ['jest', 'ftr'], ['test-1', 'test-2']);

    expect(query).toContain('@timestamp >= "2026-10-13T00:00:00.000Z"');
    expect(query).toContain('buildkite.pipeline.slug == "kibana-on-merge"');
    expect(query).toContain('buildkite.branch == "main"');
    expect(query).toContain('test.id IN ("test-1", "test-2")');
    expect(query).toContain(
      'BY test.id, test_run.config.file.path, test_run.target.mode, test_run.target.type, buildkite.build.number'
    );
    expect(query).toContain(`LIMIT ${ESQL_ROW_LIMIT}`);
  });

  it('reads one test-end per run for Jest, FTR and Cypress, with no in-run retries', () => {
    const query = buildRecentRunsQuery(scope, ['jest'], ['test-1']);

    expect(query).toContain('(event.action == "test-end" AND reporter.type IN ("jest"))');
    expect(query).toContain(
      'is_execution = CASE((event.action == "test-end" AND reporter.type IN ("jest") AND test.status IN ("passed", "failed", "timedOut")), 1, 0)'
    );
    expect(query).toContain('recovered = 0');
    expect(query).toContain(
      'failed = CASE(test.status IN ("failed", "timedOut"), 1, 0) - recovered'
    );
  });

  it('reads one test-outcome per run for Playwright, telling retry flakes from failures', () => {
    const query = buildRecentRunsQuery(scope, ['playwright'], ['test-1']);

    expect(query).toContain(
      '(event.action == "test-outcome" AND reporter.type IN ("playwright") AND TO_LONG(test.attempts) > 0)'
    );
    expect(query).toContain('recovered = CASE(test.outcome == "flaky", 1, 0)');
    expect(query).toContain(
      'failed = CASE(test.outcome IN ("unexpected", "flaky"), 1, 0) - recovered'
    );
  });

  it('records how many job attempts reported the test, and what the test and config are', () => {
    const query = buildRecentRunsQuery(scope, ['ftr'], ['test-1']);

    expect(query).toContain('attempts = COUNT_DISTINCT(TO_INTEGER(buildkite.retry_count))');
    expect(query).toContain('suite_title = MAX(suite.title.keyword)');
    expect(query).toContain('config_category = MAX(test_run.config.category)');
  });
});

describe('fetchRecentRuns', () => {
  it('returns each test and setup with its runs per build, oldest first, settled by a second attempt', async () => {
    const { client } = mockEs([
      row({ build: 3, passed: 0, failed: 2, attempts: 2, commit: 'ccc' }),
      row({ build: 1 }),
      row({ build: 2, passed: 0, failed: 1, attempts: 1 }),
      row({ build: 4, passed: 0, failed: 1, attempts: 1 }),
      row({
        build: 1,
        target_mode: 'serverless-search',
        config_path: null,
        target_type: null,
        config_category: null,
      }),
    ]);

    const runs = await fetchRecentRuns(client, scope, [
      { testId: 'test-1', framework: 'playwright' },
    ]);

    expect(runs).toEqual([
      {
        testId: 'test-1',
        suiteTitle: 'Discover',
        setup: {
          configPath: 'x-pack/test/scout/ui/playwright.config.ts',
          configCategory: 'ui-test',
          targetMode: 'stateful-classic',
          targetType: 'local',
        },
        runs: [
          expect.objectContaining({ build: 1, passed: 1, settled: false, commit: 'abc' }),
          expect.objectContaining({ build: 2, failed: 1, settled: false }),
          expect.objectContaining({ build: 3, failed: 2, settled: true, commit: 'ccc' }),
          // one report from a retried job, after a lost agent: another attempt may follow
          expect.objectContaining({ build: 4, failed: 1, settled: false }),
        ],
      },
      {
        testId: 'test-1',
        suiteTitle: 'Discover',
        setup: {
          configPath: undefined,
          configCategory: undefined,
          targetMode: 'serverless-search',
          targetType: undefined,
        },
        runs: [expect.objectContaining({ build: 1 })],
      },
    ]);
    expect(runs[0].runs[0]).toEqual({
      build: 1,
      buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/1',
      commit: 'abc',
      lastAt: new Date('2026-10-16T10:00:00.000Z'),
      passed: 1,
      failed: 0,
      recovered: 0,
      skipped: 0,
      settled: false,
    });
  });

  it('takes the suite title of the latest build and none when the framework reports none', async () => {
    const { client } = mockEs([
      row({ build: 2, suite_title: 'Discover moved' }),
      row({ build: 1, suite_title: 'Discover' }),
      row({ test_id: 'test-2', suite_title: 'unknown' }),
      row({ test_id: 'test-3', suite_title: null }),
    ]);

    const runs = await fetchRecentRuns(client, scope, [
      { testId: 'test-1', framework: 'jest' },
      { testId: 'test-2', framework: 'jest' },
      { testId: 'test-3', framework: 'jest' },
    ]);

    expect(runs.map(({ testId, suiteTitle }) => ({ testId, suiteTitle }))).toEqual([
      { testId: 'test-1', suiteTitle: 'Discover moved' },
      { testId: 'test-2', suiteTitle: undefined },
      { testId: 'test-3', suiteTitle: undefined },
    ]);
  });

  it('queries each execution model on its own and batches the tests', async () => {
    const { client, esql } = mockEs([]);
    const tests = [
      ...Array.from({ length: 6 }, (_, index) => ({
        testId: `pw-${index}`,
        framework: 'playwright' as const,
      })),
      { testId: 'jest-1', framework: 'jest' as const },
    ];

    await fetchRecentRuns(client, scope, tests);

    const queries = esql.mock.calls.map(([{ query }]) => query as string);
    expect(queries).toHaveLength(3);
    expect(queries.filter((query) => query.includes('reporter.type IN ("jest")'))).toHaveLength(1);
    expect(queries.filter((query) => query.includes('"pw-0"'))).toHaveLength(1);
    expect(queries.filter((query) => query.includes('"pw-5"'))).toHaveLength(1);
  });

  it('fails rather than return a cut-off history', async () => {
    const { client } = mockEs(
      Array.from({ length: ESQL_ROW_LIMIT }, (_, index) => row({ build: index }))
    );

    await expect(
      fetchRecentRuns(client, scope, [{ testId: 'test-1', framework: 'ftr' }])
    ).rejects.toThrow('row limit');
  });

  it('asks nothing for no tests', async () => {
    const { client, esql } = mockEs([]);

    expect(await fetchRecentRuns(client, scope, [])).toEqual([]);
    expect(esql).not.toHaveBeenCalled();
  });
});
