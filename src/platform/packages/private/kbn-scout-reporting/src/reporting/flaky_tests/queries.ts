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
import { ESQL_ROW_LIMIT, inList, quoteEsqlString } from './esql';
import { buildExecutionModels } from './execution_model';
import type {
  FlakyTestBranchStats,
  FlakyTestPipelineStats,
  FlakyTestReportThresholds,
  FlakyTestSampleFailure,
  FlakyTestTrend,
  TestFramework,
} from './schema';

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
  /** Title of the enclosing describe blocks; absent when the framework reports none. */
  suiteTitle?: string;
  filePath?: string;
  configPath?: string;
  owners: string[];
  areas: string[];
}

/** What the Jest reporter writes as the suite title of a test outside any describe block. */
const UNKNOWN_SUITE_TITLE = 'unknown';

const asArray = (value: string | string[] | null | undefined): string[] => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

/** Tests split by execution model, so each group can be queried the way its framework requires. */
const groupByExecutionModel = (
  tests: ReadonlyArray<{ testId: string; framework: TestFramework }>
): Array<{ frameworks: readonly TestFramework[]; testIds: string[] }> =>
  buildExecutionModels([...new Set(tests.map((test) => test.framework))]).map((model) => ({
    frameworks: model.frameworks,
    testIds: tests
      .filter((test) => model.frameworks.includes(test.framework))
      .map((test) => test.testId),
  }));

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
 * Per-branch build counts and latest run for the given tests of one execution model. Counts only
 * consider executions, while the latest run is the newest run document of any status so that
 * skipped tests are reported as such. Only ever run for a few hundred tests, so the `test.id`
 * filter keeps it affordable; `LAST` is the expensive part, which is why Playwright attempts are
 * left out and only its per-run `test-outcome` documents are scanned.
 */
export const buildBranchStatsQuery = (
  scope: FlakyTestQueryScope,
  frameworks: readonly TestFramework[],
  testIds: readonly string[]
): string => {
  const [model] = buildExecutionModels(frameworks);

  return [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[...scopeClauses(scope), model.runFilter, `test.id IN (${inList(testIds)})`].join(
      ' AND '
    )}`,
    `EVAL is_execution = CASE(${model.executionFilter}, 1, 0),` +
      ` failed = CASE(is_execution == 1 AND ${model.failedExpression} == 1, 1, 0),` +
      // skipped Playwright runs may carry no status at all
      ' status = CASE(test.outcome == "flaky", "flaky", test.outcome == "skipped", "skipped", test.status)',
    'STATS builds = COUNT_DISTINCT(CASE(is_execution == 1, buildkite.build.id, NULL)),' +
      ' failed_builds = COUNT_DISTINCT(CASE(failed == 1, buildkite.build.id, NULL)),' +
      ' last_failed_at = MAX(CASE(failed == 1, @timestamp, NULL)),' +
      ' latest_execution_at = MAX(CASE(is_execution == 1, @timestamp, NULL)),' +
      ' latest_status = LAST(status, @timestamp),' +
      ' latest_at = MAX(@timestamp),' +
      ' latest_build_url = LAST(buildkite.build.url, @timestamp)' +
      ' BY test.id, buildkite.branch',
    'RENAME test.id AS test_id, buildkite.branch AS branch',
    `LIMIT ${ESQL_ROW_LIMIT}`,
  ].join(' | ');
};

/** The build count thresholds a branch has to clear before its failure rate matters. */
export type BranchCountThresholds = Pick<
  FlakyTestReportThresholds,
  'minBuilds' | 'minFailedBuilds'
>;

/**
 * Per-branch execution and build counts for the given tests of one execution model. This is
 * what the thresholds are checked against, branch by branch; it runs for every test that
 * clears the thresholds on its totals, before ranking. Branches below the build count thresholds
 * are dropped in the query: they cannot qualify a test, and leaving them out is what keeps the
 * result small when pull request pipelines, with a branch per PR, are in scope. Counts only, so
 * it stays cheap; the expensive latest-run lookup is left to `buildBranchStatsQuery`, which only
 * runs for the tests that make the report.
 */
export const buildBranchCountsQuery = (
  scope: FlakyTestQueryScope,
  frameworks: readonly TestFramework[],
  testIds: readonly string[],
  thresholds: BranchCountThresholds
): string => {
  const [model] = buildExecutionModels(frameworks);

  return [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[
      ...scopeClauses(scope),
      model.executionFilter,
      `test.id IN (${inList(testIds)})`,
    ].join(' AND ')}`,
    `EVAL failed = ${model.failedExpression}`,
    'STATS builds = COUNT_DISTINCT(buildkite.build.id),' +
      ' failed_builds = COUNT_DISTINCT(CASE(failed == 1, buildkite.build.id, NULL))' +
      ' BY test.id, buildkite.branch',
    `WHERE builds >= ${thresholds.minBuilds} AND failed_builds >= ${thresholds.minFailedBuilds}`,
    'RENAME test.id AS test_id, buildkite.branch AS branch',
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
      ' suite_title = MAX(suite.title.keyword),' +
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
    suite_title: string | null;
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
        suiteTitle:
          record.suite_title && record.suite_title !== UNKNOWN_SUITE_TITLE
            ? record.suite_title
            : undefined,
        filePath: record.file_path ?? undefined,
        configPath: record.config_path ?? undefined,
        owners: asArray(record.owners),
        areas: asArray(record.areas),
      },
    ])
  );
};

/**
 * Per-branch build counts and latest run for the given tests, most failed builds first. Tests are
 * grouped by execution model so that each one is counted the way its framework requires.
 */
export const fetchBranchStats = async (
  es: ESClient,
  scope: FlakyTestQueryScope,
  tests: ReadonlyArray<{ testId: string; framework: TestFramework }>
): Promise<Map<string, FlakyTestBranchStats[]>> => {
  const results = await Promise.all(
    groupByExecutionModel(tests).map(({ frameworks, testIds }) =>
      runEsql<{
        test_id: string;
        branch: string | null;
        builds: number;
        failed_builds: number;
        last_failed_at: string | null;
        latest_execution_at: string | null;
        latest_status: string | null;
        latest_at: string | null;
        latest_build_url: string | null;
      }>(es, buildBranchStatsQuery(scope, frameworks, testIds))
    )
  );

  const byTest = new Map<string, FlakyTestBranchStats[]>();
  for (const record of results.flat()) {
    if (record.branch === null) continue;
    const stats = byTest.get(record.test_id) ?? [];
    stats.push({
      branch: record.branch,
      builds: record.builds,
      failedBuilds: record.failed_builds,
      buildFailRate: record.builds > 0 ? record.failed_builds / record.builds : 0,
      lastFailedAt: record.last_failed_at ? new Date(record.last_failed_at) : undefined,
      latestExecutionAt: record.latest_execution_at
        ? new Date(record.latest_execution_at)
        : undefined,
      latestRun:
        record.latest_status && record.latest_at
          ? {
              status: record.latest_status,
              timestamp: new Date(record.latest_at),
              buildUrl: record.latest_build_url || undefined,
            }
          : undefined,
    });
    byTest.set(record.test_id, stats);
  }
  for (const stats of byTest.values()) {
    stats.sort((a, b) => b.failedBuilds - a.failedBuilds || b.builds - a.builds);
  }
  return byTest;
};

/** Build counts of one test on one branch. */
export interface BranchCountsRow {
  branch: string;
  builds: number;
  failedBuilds: number;
}

/**
 * Per-branch build counts of the branches clearing the count thresholds, keyed by test id, most
 * failed builds first. A test whose rows were cut off by the row limit would pass for one that
 * qualifies on no branch, so unlike the lookups that only add detail this one fails rather than
 * return a truncated result.
 */
export const fetchBranchCounts = async (
  es: ESClient,
  scope: FlakyTestQueryScope,
  tests: ReadonlyArray<{ testId: string; framework: TestFramework }>,
  thresholds: BranchCountThresholds
): Promise<Map<string, BranchCountsRow[]>> => {
  if (tests.length === 0) {
    return new Map();
  }

  const results = await Promise.all(
    groupByExecutionModel(tests).map(({ frameworks, testIds }) =>
      runEsql<{
        test_id: string;
        branch: string | null;
        builds: number;
        failed_builds: number;
      }>(es, buildBranchCountsQuery(scope, frameworks, testIds, thresholds))
    )
  );
  if (results.some((records) => records.length >= ESQL_ROW_LIMIT)) {
    throw new Error(
      `Per-branch counts query hit the ${ESQL_ROW_LIMIT} row limit; narrow the scope with --branches`
    );
  }

  const byTest = new Map<string, BranchCountsRow[]>();
  for (const record of results.flat()) {
    if (record.branch === null) continue;
    const rows = byTest.get(record.test_id) ?? [];
    rows.push({
      branch: record.branch,
      builds: record.builds,
      failedBuilds: record.failed_builds,
    });
    byTest.set(record.test_id, rows);
  }
  for (const rows of byTest.values()) {
    rows.sort((a, b) => b.failedBuilds - a.failedBuilds || b.builds - a.builds);
  }
  return byTest;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC of the day containing `date`. */
export const startOfUtcDay = (date: Date): Date =>
  new Date(Math.floor(date.getTime() / MS_PER_DAY) * MS_PER_DAY);

/** Start of the first of the `days` UTC days ending with the one that contains `to`. */
export const trendFrom = (to: Date, days: number): Date =>
  new Date(startOfUtcDay(to).getTime() - (days - 1) * MS_PER_DAY);

/**
 * Per-test, per-UTC-day build counts for the given tests of one execution model. Grouping by
 * `test.id` is affordable because of the `test.id` filter; days without executions produce no
 * row and are filled in by the caller.
 */
export const buildDailyTrendQuery = (
  scope: FlakyTestQueryScope,
  frameworks: readonly TestFramework[],
  testIds: readonly string[]
): string => {
  const [model] = buildExecutionModels(frameworks);

  return [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[
      ...scopeClauses(scope),
      model.executionFilter,
      `test.id IN (${inList(testIds)})`,
    ].join(' AND ')}`,
    `EVAL failed = ${model.failedExpression}, day = DATE_TRUNC(1 day, @timestamp)`,
    'STATS builds = COUNT_DISTINCT(buildkite.build.id),' +
      ' failed_builds = COUNT_DISTINCT(CASE(failed == 1, buildkite.build.id, NULL))' +
      ' BY test.id, day',
    'RENAME test.id AS test_id',
    `LIMIT ${ESQL_ROW_LIMIT}`,
  ].join(' | ');
};

/**
 * Per-day build counts over the `days` UTC days ending with the one containing `scope.to`, in
 * the pipelines and branches of the scope. Every test gets an entry, with zeros for days it did
 * not run. The window end is respected, so the last day is partial when `to` is not midnight.
 */
export const fetchDailyTrend = async (
  es: ESClient,
  scope: FlakyTestQueryScope,
  tests: ReadonlyArray<{ testId: string; framework: TestFramework }>,
  days: number
): Promise<Map<string, FlakyTestTrend>> => {
  if (tests.length === 0 || days <= 0) {
    return new Map();
  }

  const from = trendFrom(scope.to, days);
  const results = await Promise.all(
    groupByExecutionModel(tests).map(({ frameworks, testIds }) =>
      runEsql<{ test_id: string; day: string; builds: number; failed_builds: number }>(
        es,
        buildDailyTrendQuery({ ...scope, from }, frameworks, testIds)
      )
    )
  );

  const byTest = new Map<string, FlakyTestTrend>(
    tests.map(({ testId }) => [
      testId,
      {
        days,
        from,
        buildsPerDay: new Array<number>(days).fill(0),
        failedBuildsPerDay: new Array<number>(days).fill(0),
      },
    ])
  );
  for (const record of results.flat()) {
    const trend = byTest.get(record.test_id);
    const index = Math.floor((new Date(record.day).getTime() - from.getTime()) / MS_PER_DAY);
    if (!trend || index < 0 || index >= days) continue;
    trend.buildsPerDay[index] = record.builds;
    trend.failedBuildsPerDay[index] = record.failed_builds;
  }
  return byTest;
};

/** Buildkite organisation the test events come from; build URLs are rebuilt from it. */
const BUILDKITE_ORG_URL = 'https://buildkite.com/elastic';

/**
 * Per-file, per-pipeline build counts for the given tests of one execution model, across every
 * pipeline and branch in the window: the report scope narrows which tests qualify, this shows
 * where else they hurt. A build counts once however many of the file's tests failed in it. The
 * framework is part of the grouping as a file is reported per framework, and one path may be
 * run by more than one within the window.
 */
export const buildFilePipelineStatsQuery = (
  window: Pick<FlakyTestQueryScope, 'from' | 'to'>,
  frameworks: readonly TestFramework[],
  testIds: readonly string[]
): string => {
  const [model] = buildExecutionModels(frameworks);

  return [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[
      ...scopeClauses({ ...window, pipelines: [], branches: [] }),
      model.executionFilter,
      `test.id IN (${inList(testIds)})`,
    ].join(' AND ')}`,
    `EVAL failed = ${model.failedExpression}`,
    'STATS builds = COUNT_DISTINCT(buildkite.build.id),' +
      ' failed_builds = COUNT_DISTINCT(CASE(failed == 1, buildkite.build.id, NULL)),' +
      ' failed_branches = COUNT_DISTINCT(CASE(failed == 1, buildkite.branch, NULL)),' +
      ' last_failed_at = MAX(CASE(failed == 1, @timestamp, NULL)),' +
      ' last_failed_build_number = MAX(CASE(failed == 1, buildkite.build.number, NULL))' +
      ' BY test.file.path, reporter.type, buildkite.pipeline.slug',
    'WHERE failed_builds > 0',
    'RENAME test.file.path AS file_path, reporter.type AS framework, buildkite.pipeline.slug AS pipeline',
    `LIMIT ${ESQL_ROW_LIMIT}`,
  ].join(' | ');
};

/** Key of a file's stats: the report has one file entry per framework and path. */
export const fileStatsKey = (framework: TestFramework, filePath: string): string =>
  `${framework}\n${filePath}`;

/** Per-pipeline stats keyed by `fileStatsKey`, most failed builds first. */
export const fetchFilePipelineStats = async (
  es: ESClient,
  window: Pick<FlakyTestQueryScope, 'from' | 'to'>,
  tests: ReadonlyArray<{ testId: string; framework: TestFramework }>
): Promise<Map<string, FlakyTestPipelineStats[]>> => {
  if (tests.length === 0) {
    return new Map();
  }

  const results = await Promise.all(
    groupByExecutionModel(tests).map(({ frameworks, testIds }) =>
      runEsql<{
        file_path: string | null;
        framework: TestFramework;
        pipeline: string | null;
        builds: number;
        failed_builds: number;
        failed_branches: number;
        last_failed_at: string | null;
        last_failed_build_number: number | null;
      }>(es, buildFilePipelineStatsQuery(window, frameworks, testIds))
    )
  );

  const byFile = new Map<string, FlakyTestPipelineStats[]>();
  for (const record of results.flat()) {
    if (record.file_path === null || record.pipeline === null) continue;
    const key = fileStatsKey(record.framework, record.file_path);
    const stats = byFile.get(key) ?? [];
    stats.push({
      pipeline: record.pipeline,
      builds: record.builds,
      failedBuilds: record.failed_builds,
      buildFailRate: record.builds > 0 ? record.failed_builds / record.builds : 0,
      failedBranches: record.failed_branches,
      lastFailedAt: record.last_failed_at ? new Date(record.last_failed_at) : undefined,
      lastFailedBuildUrl:
        record.last_failed_build_number !== null
          ? `${BUILDKITE_ORG_URL}/${record.pipeline}/builds/${record.last_failed_build_number}`
          : undefined,
    });
    byFile.set(key, stats);
  }
  for (const stats of byFile.values()) {
    stats.sort((a, b) => b.failedBuilds - a.failedBuilds || b.builds - a.builds);
  }
  return byFile;
};

const scopeFilter = (scope: FlakyTestQueryScope): object[] => {
  const filter: object[] = [
    { range: { '@timestamp': { gte: scope.from.toISOString(), lt: scope.to.toISOString() } } },
  ];
  if (scope.pipelines.length > 0) {
    filter.push({ terms: { 'buildkite.pipeline.slug': scope.pipelines } });
  }
  if (scope.branches.length > 0) {
    filter.push({ terms: { 'buildkite.branch': scope.branches } });
  }
  return filter;
};

interface LatestHitsBuckets<TSource> {
  by_test: {
    buckets: Array<{
      key: string;
      latest: { hits: { hits: Array<{ _source?: TSource }> } };
    }>;
  };
}

/** Latest `size` documents per test id, newest first. */
const searchLatestPerTest = async <TSource>(
  es: ESClient,
  filter: object[],
  testIds: readonly string[],
  size: number,
  sourceFields: readonly string[]
): Promise<Map<string, TSource[]>> => {
  const response = await es.search<TSource, LatestHitsBuckets<TSource>>({
    index: SCOUT_TEST_EVENTS_INDEX_PATTERN,
    size: 0,
    query: { bool: { filter } },
    aggs: {
      by_test: {
        terms: { field: 'test.id', size: testIds.length },
        aggs: {
          latest: {
            top_hits: { size, sort: [{ '@timestamp': 'desc' }], _source: [...sourceFields] },
          },
        },
      },
    },
  });

  return new Map(
    (response.aggregations?.by_test.buckets ?? []).map((bucket) => [
      bucket.key,
      bucket.latest.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : [])),
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

  const hits = await searchLatestPerTest<SampleFailureSource>(
    es,
    [
      ...scopeFilter(scope),
      { term: { 'event.action': 'test-end' } },
      { terms: { 'test.status': ['failed', 'timedOut'] } },
      { terms: { 'test.id': testIds } },
    ],
    testIds,
    samplesPerTest,
    ['@timestamp', 'event.error.message', 'buildkite.build.url']
  );

  const samples = new Map<string, FlakyTestSampleFailure[]>();
  for (const [testId, sources] of hits) {
    samples.set(
      testId,
      sources.flatMap((source) => {
        const message = source.event?.error?.message?.trim();
        if (!message) return [];
        return [
          {
            message,
            buildUrl: source.buildkite?.build?.url || undefined,
            timestamp: new Date(source['@timestamp']),
          },
        ];
      })
    );
  }

  return samples;
};
