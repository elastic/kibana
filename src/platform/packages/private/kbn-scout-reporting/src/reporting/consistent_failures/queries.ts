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
import { ESQL_ROW_LIMIT, inList, quoteEsqlString } from '../flaky_tests/esql';
import { buildExecutionModels } from '../flaky_tests/execution_model';
import { groupByExecutionModel, runEsql } from '../flaky_tests/queries';
import type { TestFramework } from '../flaky_tests/schema';
import type { BuildRun } from './rule';

/** The builds the runs come from: one pipeline and branch, from a point in time on. */
export interface RecentRunsScope {
  pipeline: string;
  branch: string;
  since: Date;
}

/** A config file and Scout target; a build runs a test once per setup. */
export interface TestSetup {
  configPath?: string;
  targetMode?: string;
  targetType?: string;
}

/** A test's runs in one setup, one per build, oldest first. */
export interface TestSetupRuns {
  testId: string;
  setup: TestSetup;
  runs: BuildRun[];
}

/**
 * A busy pipeline runs a test in a setup around 70 times a day, so a few days of history for
 * this many tests, each in a couple of setups, stays under the row limit.
 */
const TESTS_PER_QUERY = 10;

/**
 * Per build, test and setup, how the test's runs went and whether a retried job reported it,
 * for the given tests of one execution model.
 */
export const buildRecentRunsQuery = (
  scope: RecentRunsScope,
  frameworks: readonly TestFramework[],
  testIds: readonly string[]
): string => {
  const [model] = buildExecutionModels(frameworks);

  return [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE ${[
      `@timestamp >= ${quoteEsqlString(scope.since.toISOString())}`,
      `buildkite.pipeline.slug == ${quoteEsqlString(scope.pipeline)}`,
      `buildkite.branch == ${quoteEsqlString(scope.branch)}`,
      model.runFilter,
      `test.id IN (${inList(testIds)})`,
    ].join(' AND ')}`,
    // A retry flake is a failure that passed on an in-run retry, so it is taken out of `failed`
    `EVAL is_execution = CASE(${model.executionFilter}, 1, 0),` +
      ` recovered = ${model.retryFlakeExpression},` +
      ` failed = ${model.failedExpression} - recovered,` +
      ` passed = is_execution - failed - recovered,` +
      ` skipped = 1 - is_execution`,
    'STATS passed = SUM(passed),' +
      ' failed = SUM(failed),' +
      ' recovered = SUM(recovered),' +
      ' skipped = SUM(skipped),' +
      ' retries = MAX(TO_INTEGER(buildkite.retry_count)),' +
      ' last_at = MAX(@timestamp),' +
      ' build_url = MAX(buildkite.build.url),' +
      ' commit = MAX(buildkite.commit)' +
      ' BY test.id, test_run.config.file.path, test_run.target.mode, test_run.target.type,' +
      ' buildkite.build.number',
    'RENAME test.id AS test_id,' +
      ' test_run.config.file.path AS config_path,' +
      ' test_run.target.mode AS target_mode,' +
      ' test_run.target.type AS target_type,' +
      ' buildkite.build.number AS build',
    `LIMIT ${ESQL_ROW_LIMIT}`,
  ].join(' | ');
};

interface RecentRunRow extends Record<string, unknown> {
  test_id: string;
  config_path: string | null;
  target_mode: string | null;
  target_type: string | null;
  build: number;
  passed: number;
  failed: number;
  recovered: number;
  skipped: number;
  retries: number | null;
  last_at: string;
  build_url: string | null;
  commit: string | null;
}

const chunk = <T>(values: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size)
  );

/**
 * The given tests' runs per setup and build within the scope. A cut-off result would pass for a
 * shorter history, so this fails rather than return one.
 */
export const fetchRecentRuns = async (
  es: ESClient,
  scope: RecentRunsScope,
  tests: ReadonlyArray<{ testId: string; framework: TestFramework }>
): Promise<TestSetupRuns[]> => {
  const results = await Promise.all(
    groupByExecutionModel(tests).flatMap(({ frameworks, testIds }) =>
      chunk(testIds, TESTS_PER_QUERY).map((batch) =>
        runEsql<RecentRunRow>(es, buildRecentRunsQuery(scope, frameworks, batch))
      )
    )
  );
  if (results.some((records) => records.length >= ESQL_ROW_LIMIT)) {
    throw new Error(`Recent runs query hit the ${ESQL_ROW_LIMIT} row limit; use a later since`);
  }

  const bySetup = new Map<string, TestSetupRuns>();
  for (const row of results.flat()) {
    const key = [row.test_id, row.config_path, row.target_mode, row.target_type].join('\n');
    const entry = bySetup.get(key) ?? {
      testId: row.test_id,
      setup: {
        configPath: row.config_path ?? undefined,
        targetMode: row.target_mode ?? undefined,
        targetType: row.target_type ?? undefined,
      },
      runs: [],
    };
    entry.runs.push({
      build: row.build,
      buildUrl: row.build_url ?? undefined,
      commit: row.commit ?? undefined,
      lastAt: new Date(row.last_at),
      passed: row.passed,
      failed: row.failed,
      recovered: row.recovered,
      skipped: row.skipped,
      retried: (row.retries ?? 0) > 0,
    });
    bySetup.set(key, entry);
  }
  for (const entry of bySetup.values()) {
    entry.runs.sort((a, b) => a.build - b.build);
  }
  return [...bySetup.values()];
};
