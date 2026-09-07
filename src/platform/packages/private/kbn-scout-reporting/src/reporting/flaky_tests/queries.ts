/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as ESClient } from '@elastic/elasticsearch';
import { SCOUT_TEST_EVENTS_INDEX_PATTERN } from '@kbn/scout-info';
import type { FlakyTestSampleFailure, TestFramework } from './schema';

/**
 * Elasticsearch silently truncates ES|QL results at this row count; callers warn when a query
 * hits it.
 */
export const ESQL_ROW_LIMIT = 10_000;

export interface FlakyTestQueryScope {
  from: Date;
  to: Date;
  pipelines: string[];
  /** Empty means no branch filter. */
  branches: string[];
}

export interface FailingFile {
  framework: TestFramework;
  filePath: string;
}

export interface TestStatsRow {
  testId: string;
  framework: TestFramework;
  runs: number;
  fails: number;
  retryFlakes: number;
  builds: number;
  failedBuilds: number;
  failedBranches: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
}

export interface TestMetadataRow {
  testId: string;
  title?: string;
  filePath?: string;
  configPath?: string;
  owners: string[];
  areas: string[];
}

/**
 * Quotes a value as an ES|QL string literal. Values come from Elasticsearch or CLI flags, but
 * they still end up inside query text, so they are escaped rather than trusted.
 */
export const quoteEsqlString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const inList = (values: readonly string[]): string => values.map(quoteEsqlString).join(', ');

const asArray = (value: string | string[] | null | undefined): string[] => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * How one execution of a test is identified per framework.
 *
 * Jest, FTR and Cypress emit a single `test-end` per test per run. Playwright retries inside a
 * run and emits one `test-end` per attempt, so its per-run verdict is the `test-outcome` event
 * instead; counting its `test-end` events would inflate rates for tests that recover on retry.
 */
interface ExecutionModel {
  frameworks: readonly TestFramework[];
  /** Filter selecting exactly one document per execution. */
  executionFilter: string;
  /** Filter selecting only failed executions. */
  failureFilter: string;
  /** ES|QL expression evaluating to 1 for a failed execution, 0 otherwise. */
  failedExpression: string;
  /** ES|QL expression evaluating to 1 when the execution failed then passed within the run. */
  retryFlakeExpression: string;
}

const ATTEMPT_MODEL_FRAMEWORKS: readonly TestFramework[] = ['jest', 'ftr', 'cypress'];
const OUTCOME_MODEL_FRAMEWORKS: readonly TestFramework[] = ['playwright'];

const buildExecutionModels = (frameworks: readonly TestFramework[]): ExecutionModel[] => {
  const models: ExecutionModel[] = [];

  const attemptFrameworks = ATTEMPT_MODEL_FRAMEWORKS.filter((fw) => frameworks.includes(fw));
  if (attemptFrameworks.length > 0) {
    const reporterFilter = `reporter.type IN (${inList(attemptFrameworks)})`;
    models.push({
      frameworks: attemptFrameworks,
      executionFilter: `(event.action == "test-end" AND ${reporterFilter} AND test.status IN ("passed", "failed", "timedOut"))`,
      failureFilter: `(event.action == "test-end" AND ${reporterFilter} AND test.status IN ("failed", "timedOut"))`,
      failedExpression: 'CASE(test.status IN ("failed", "timedOut"), 1, 0)',
      retryFlakeExpression: '0',
    });
  }

  const outcomeFrameworks = OUTCOME_MODEL_FRAMEWORKS.filter((fw) => frameworks.includes(fw));
  if (outcomeFrameworks.length > 0) {
    const reporterFilter = `reporter.type IN (${inList(outcomeFrameworks)})`;
    models.push({
      frameworks: outcomeFrameworks,
      executionFilter: `(event.action == "test-outcome" AND ${reporterFilter} AND test.outcome IN ("expected", "unexpected", "flaky"))`,
      failureFilter: `(event.action == "test-outcome" AND ${reporterFilter} AND test.outcome IN ("unexpected", "flaky"))`,
      failedExpression: 'CASE(test.outcome IN ("unexpected", "flaky"), 1, 0)',
      retryFlakeExpression: 'CASE(test.outcome == "flaky", 1, 0)',
    });
  }

  return models;
};

const scopeClauses = (scope: FlakyTestQueryScope): string[] => {
  const clauses = [
    `@timestamp >= ${quoteEsqlString(scope.from.toISOString())}`,
    `@timestamp < ${quoteEsqlString(scope.to.toISOString())}`,
  ];
  if (scope.pipelines.length > 0) {
    clauses.push(`buildkite.pipeline.slug IN (${inList(scope.pipelines)})`);
  }
  if (scope.branches.length > 0) {
    clauses.push(`buildkite.branch IN (${inList(scope.branches)})`);
  }
  return clauses;
};

/**
 * Failure filter across all requested frameworks. Failures are a tiny fraction of events, so
 * queries using only this filter are cheap even without further scoping.
 */
const anyFailureFilter = (frameworks: readonly TestFramework[]): string =>
  `(${buildExecutionModels(frameworks)
    .map((model) => model.failureFilter)
    .join(' OR ')})`;

/** Files with at least one failed execution in the window, per framework. */
export const buildFailingFilesQuery = (
  scope: FlakyTestQueryScope,
  frameworks: readonly TestFramework[]
): string =>
  [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[...scopeClauses(scope), anyFailureFilter(frameworks)].join(' AND ')}`,
    'STATS fails = COUNT(*) BY test.file.path, reporter.type',
    'RENAME test.file.path AS file_path, reporter.type AS framework',
    `LIMIT ${ESQL_ROW_LIMIT}`,
  ].join(' | ');

/**
 * Per-test execution and build counts for one framework, scoped to the given files. Scoping is
 * what keeps this affordable: an unscoped aggregation by `test.id` spans close to a million
 * groups and does not return in reasonable time.
 */
export const buildTestStatsQuery = (
  scope: FlakyTestQueryScope,
  framework: TestFramework,
  filePaths: readonly string[]
): string => {
  const [model] = buildExecutionModels([framework]);

  return [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[
      ...scopeClauses(scope),
      model.executionFilter,
      `test.file.path IN (${inList(filePaths)})`,
    ].join(' AND ')}`,
    `EVAL failed = ${model.failedExpression}, retry_flake = ${model.retryFlakeExpression}`,
    'STATS runs = COUNT(*),' +
      ' fails = SUM(failed),' +
      ' retry_flakes = SUM(retry_flake),' +
      ' builds = COUNT_DISTINCT(buildkite.build.id),' +
      ' failed_builds = COUNT_DISTINCT(CASE(failed == 1, buildkite.build.id, NULL)),' +
      ' failed_branches = COUNT_DISTINCT(CASE(failed == 1, buildkite.branch, NULL)),' +
      ' first_failed_at = MIN(CASE(failed == 1, @timestamp, NULL)),' +
      ' last_failed_at = MAX(CASE(failed == 1, @timestamp, NULL))' +
      ' BY test.id, reporter.type',
    'WHERE fails > 0',
    'RENAME test.id AS test_id, reporter.type AS framework',
    `LIMIT ${ESQL_ROW_LIMIT}`,
  ].join(' | ');
};

/**
 * Descriptive fields per failing test, read from failure documents only so the query stays
 * cheap regardless of how many passes there are.
 */
export const buildTestMetadataQuery = (
  scope: FlakyTestQueryScope,
  frameworks: readonly TestFramework[]
): string =>
  [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[...scopeClauses(scope), anyFailureFilter(frameworks)].join(' AND ')}`,
    'STATS title = MAX(test.title.keyword),' +
      ' file_path = MAX(test.file.path),' +
      ' config_path = MAX(test_run.config.file.path),' +
      ' owners = VALUES(test.file.owner),' +
      ' areas = VALUES(test.file.area)' +
      ' BY test.id',
    'RENAME test.id AS test_id',
    `LIMIT ${ESQL_ROW_LIMIT}`,
  ].join(' | ');

const runEsql = async <T extends Record<string, unknown>>(
  es: ESClient,
  query: string
): Promise<T[]> => {
  const { records } = await es.helpers.esql({ query }).toRecords<T>();
  return records;
};

export const fetchFailingFiles = async (
  es: ESClient,
  scope: FlakyTestQueryScope,
  frameworks: readonly TestFramework[]
): Promise<FailingFile[]> => {
  const records = await runEsql<{ file_path: string | null; framework: TestFramework }>(
    es,
    buildFailingFilesQuery(scope, frameworks)
  );

  return records
    .filter((record) => record.file_path !== null && frameworks.includes(record.framework))
    .map((record) => ({ framework: record.framework, filePath: record.file_path as string }));
};

export const fetchTestStats = async (
  es: ESClient,
  scope: FlakyTestQueryScope,
  framework: TestFramework,
  filePaths: readonly string[]
): Promise<TestStatsRow[]> => {
  if (filePaths.length === 0) {
    return [];
  }

  const records = await runEsql<{
    test_id: string;
    framework: TestFramework;
    runs: number;
    fails: number;
    retry_flakes: number;
    builds: number;
    failed_builds: number;
    failed_branches: number;
    first_failed_at: string;
    last_failed_at: string;
  }>(es, buildTestStatsQuery(scope, framework, filePaths));

  return records.map((record) => ({
    testId: record.test_id,
    framework: record.framework,
    runs: record.runs,
    fails: record.fails,
    retryFlakes: record.retry_flakes,
    builds: record.builds,
    failedBuilds: record.failed_builds,
    failedBranches: record.failed_branches,
    firstFailedAt: new Date(record.first_failed_at),
    lastFailedAt: new Date(record.last_failed_at),
  }));
};

export const fetchTestMetadata = async (
  es: ESClient,
  scope: FlakyTestQueryScope,
  frameworks: readonly TestFramework[]
): Promise<Map<string, TestMetadataRow>> => {
  const records = await runEsql<{
    test_id: string;
    title: string | null;
    file_path: string | null;
    config_path: string | null;
    owners: string | string[] | null;
    areas: string | string[] | null;
  }>(es, buildTestMetadataQuery(scope, frameworks));

  return new Map(
    records.map((record) => [
      record.test_id,
      {
        testId: record.test_id,
        title: record.title ?? undefined,
        filePath: record.file_path ?? undefined,
        configPath: record.config_path ?? undefined,
        owners: asArray(record.owners),
        areas: asArray(record.areas),
      },
    ])
  );
};

interface SampleFailureSource {
  '@timestamp': string;
  event?: { error?: { message?: string } };
  buildkite?: { build?: { url?: string } };
}

/**
 * Most recent failure messages per test. Error messages are mapped as `text` and cannot be
 * aggregated in ES|QL, so this uses a `terms` + `top_hits` search over attempt-level `test-end`
 * failures instead (attempt failures carry the error for every framework, including Playwright).
 */
export const fetchSampleFailures = async (
  es: ESClient,
  scope: FlakyTestQueryScope,
  testIds: readonly string[],
  samplesPerTest: number
): Promise<Map<string, FlakyTestSampleFailure[]>> => {
  if (testIds.length === 0 || samplesPerTest <= 0) {
    return new Map();
  }

  const filter: object[] = [
    { range: { '@timestamp': { gte: scope.from.toISOString(), lt: scope.to.toISOString() } } },
    { term: { 'event.action': 'test-end' } },
    { terms: { 'test.status': ['failed', 'timedOut'] } },
    { terms: { 'test.id': testIds } },
  ];
  if (scope.pipelines.length > 0) {
    filter.push({ terms: { 'buildkite.pipeline.slug': scope.pipelines } });
  }
  if (scope.branches.length > 0) {
    filter.push({ terms: { 'buildkite.branch': scope.branches } });
  }

  const response = await es.search<
    SampleFailureSource,
    {
      by_test: {
        buckets: Array<{
          key: string;
          latest: { hits: { hits: Array<{ _source?: SampleFailureSource }> } };
        }>;
      };
    }
  >({
    index: SCOUT_TEST_EVENTS_INDEX_PATTERN,
    size: 0,
    query: { bool: { filter } },
    aggs: {
      by_test: {
        terms: { field: 'test.id', size: testIds.length },
        aggs: {
          latest: {
            top_hits: {
              size: samplesPerTest,
              sort: [{ '@timestamp': 'desc' }],
              _source: ['@timestamp', 'event.error.message', 'buildkite.build.url'],
            },
          },
        },
      },
    },
  });

  const samples = new Map<string, FlakyTestSampleFailure[]>();
  for (const bucket of response.aggregations?.by_test.buckets ?? []) {
    samples.set(
      bucket.key,
      bucket.latest.hits.hits.flatMap((hit) => {
        const message = hit._source?.event?.error?.message?.trim();
        if (!hit._source || !message) return [];
        return [
          {
            message,
            buildUrl: hit._source.buildkite?.build?.url || undefined,
            timestamp: new Date(hit._source['@timestamp']),
          },
        ];
      })
    );
  }

  return samples;
};
