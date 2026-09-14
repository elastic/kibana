/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Client as ESClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { ESQL_ROW_LIMIT } from './esql';
import {
  fetchBranchStats,
  fetchDailyTrend,
  fetchFailingFiles,
  fetchFilePipelineStats,
  fetchLatestExecutions,
  fetchSampleFailures,
  fetchTestMetadata,
  fetchTestStats,
  type FlakyTestQueryScope,
  type TestFailureSamples,
  type TestMetadataRow,
  type TestStatsRow,
} from './queries';
import {
  FLAKY_TEST_CLASSIFICATIONS,
  FLAKY_TEST_REPORT_SCHEMA_VERSION,
  FlakyTestReportSchema,
  type FlakyTestBranchStats,
  type FlakyTestClassification,
  type FlakyTestEntry,
  type FlakyTestFileStats,
  type FlakyTestLatestRun,
  type FlakyTestPipelineStats,
  type FlakyTestReport,
  type FlakyTestReportOptions,
  type FlakyTestReportThresholds,
  type FlakyTestTrend,
  type TestFramework,
} from './schema';

/** The newest of the per-branch latest runs, tagged with its branch. */
export const latestRunAcrossBranches = (
  byBranch: readonly FlakyTestBranchStats[] | undefined
): FlakyTestLatestRun | undefined => {
  let latest: FlakyTestLatestRun | undefined;
  for (const { branch, latestRun } of byBranch ?? []) {
    if (latestRun && (!latest || latestRun.timestamp > latest.timestamp)) {
      latest = { ...latestRun, branch };
    }
  }
  return latest;
};

/**
 * A test qualifies when it ran and failed in enough builds, and in a large enough share of them.
 * It is flaky when it also had at least one clean pass or recovered on an in-run retry;
 * otherwise it is simply broken.
 */
export const classifyTest = (
  stats: Pick<TestStatsRow, 'runs' | 'fails' | 'retryFlakes' | 'builds' | 'failedBuilds'>,
  thresholds: Pick<FlakyTestReportThresholds, 'minBuilds' | 'minFailedBuilds' | 'minFailRate'>
): FlakyTestClassification | undefined => {
  if (stats.builds < thresholds.minBuilds || stats.failedBuilds < thresholds.minFailedBuilds) {
    return undefined;
  }
  if (stats.failedBuilds / stats.builds < thresholds.minFailRate) {
    return undefined;
  }

  const passes = stats.runs - stats.fails;
  return passes > 0 || stats.retryFlakes > 0 ? 'flaky' : 'consistently-failing';
};

type Rankable = Pick<FlakyTestEntry, 'failedBuilds' | 'buildFailRate' | 'lastFailedAt'>;

/** Most failed builds first; ties broken by build failure rate, then by most recent failure. */
export const compareByFailedBuilds = (a: Rankable, b: Rankable): number =>
  b.failedBuilds - a.failedBuilds ||
  b.buildFailRate - a.buildFailRate ||
  b.lastFailedAt.getTime() - a.lastFailedAt.getTime();

export const rankTests = <T extends Rankable>(entries: readonly T[]): T[] =>
  [...entries].sort(compareByFailedBuilds);

/** An entry before the per-test lookups (latest run, branch stats, failure samples) are attached. */
type AggregatedEntry = Omit<FlakyTestEntry, 'latestRun' | 'byBranch' | 'sampleFailures'>;

const toEntry = (stats: TestStatsRow, metadata: TestMetadataRow | undefined): AggregatedEntry => ({
  testId: stats.testId,
  framework: stats.framework,
  title: metadata?.title ?? '(unknown)',
  filePath: metadata?.filePath ?? '(unknown)',
  configPath: metadata?.configPath,
  owners: metadata?.owners ?? [],
  areas: metadata?.areas ?? [],
  runs: stats.runs,
  fails: stats.fails,
  passes: stats.runs - stats.fails,
  retryFlakes: stats.retryFlakes,
  builds: stats.builds,
  failedBuilds: stats.failedBuilds,
  buildFailRate: stats.builds > 0 ? stats.failedBuilds / stats.builds : 0,
  failedBranches: stats.failedBranches,
  firstFailedAt: stats.firstFailedAt,
  lastFailedAt: stats.lastFailedAt,
});

const groupByFramework = <T extends { framework: TestFramework }>(
  items: readonly T[]
): Map<TestFramework, T[]> => {
  const groups = new Map<TestFramework, T[]>();
  for (const item of items) {
    groups.set(item.framework, [...(groups.get(item.framework) ?? []), item]);
  }
  return groups;
};

const elapsed = (startedAt: number): string =>
  `${((performance.now() - startedAt) / 1000).toFixed(1)}s`;

/**
 * Failures are rare, so everything starts from them: find files with failures, aggregate
 * per-test execution and build counts scoped to those files, drop the qualifying tests that no
 * longer execute, then decorate the highest ranked ones with metadata, per-branch and
 * per-pipeline stats, trends and recent failure samples.
 */
const buildReport = async (
  es: ESClient,
  options: FlakyTestReportOptions,
  log: ToolingLog
): Promise<FlakyTestReport> => {
  if (!Number.isInteger(options.lookbackDays) || options.lookbackDays < 1) {
    throw new Error(`lookbackDays must be a positive integer, got ${options.lookbackDays}`);
  }
  if (!Number.isInteger(options.trendDays) || options.trendDays < 0) {
    throw new Error(`trendDays must be a non-negative integer, got ${options.trendDays}`);
  }
  if (options.classifications.length === 0) {
    throw new Error(
      `classifications must include at least one of: ${FLAKY_TEST_CLASSIFICATIONS.join(', ')}`
    );
  }

  const { thresholds, frameworks } = options;
  const classifications = new Set<FlakyTestClassification>(options.classifications);
  const to = options.now ?? new Date();
  const from = new Date(to.getTime() - options.lookbackDays * 24 * 60 * 60 * 1000);
  const scope: FlakyTestQueryScope = {
    from,
    to,
    pipelines: options.pipelines,
    branches: options.branches,
  };

  const warnIfTruncated = (label: string, rowCount: number) => {
    if (rowCount >= ESQL_ROW_LIMIT) {
      log.warning(`${label} hit the ${ESQL_ROW_LIMIT} row limit; results may be incomplete`);
    }
  };

  let startedAt = performance.now();
  const failingFiles = await fetchFailingFiles(es, scope, frameworks);
  warnIfTruncated('Failing files query', failingFiles.length);
  log.info(`Found ${failingFiles.length} test files with failures in ${elapsed(startedAt)}`);

  const stats: TestStatsRow[] = [];
  for (const [framework, files] of groupByFramework(failingFiles)) {
    startedAt = performance.now();
    const rows = await fetchTestStats(
      es,
      scope,
      framework,
      files.map((file) => file.filePath)
    );
    warnIfTruncated(`Test stats query for ${framework}`, rows.length);
    log.info(
      `Aggregated ${rows.length} failing ${framework} tests across ${
        files.length
      } test files in ${elapsed(startedAt)}`
    );
    stats.push(...rows);
  }

  const flaky: AggregatedEntry[] = [];
  const consistentlyFailing: AggregatedEntry[] = [];
  let candidates = stats.flatMap((row) => {
    const classification = classifyTest(row, thresholds);
    return classification && classifications.has(classification) ? [{ row, classification }] : [];
  });

  // Tests that no longer execute in the scope (skipped, moved or deleted since) are dropped
  // before ranking, so the caps are filled with tests that can still be fixed
  if (candidates.length > 0) {
    startedAt = performance.now();
    const latestExecutions = await fetchLatestExecutions(
      es,
      scope,
      candidates.map(({ row }) => row),
      thresholds.maxInactiveHours
    );
    const active = candidates.filter(({ row }) => latestExecutions.has(row.testId));
    log.info(
      `Dropped ${candidates.length - active.length} of ${candidates.length} qualifying tests ` +
        `without an execution in the last ${thresholds.maxInactiveHours}h ` +
        `(skipped, moved or deleted) in ${elapsed(startedAt)}`
    );
    candidates = active;
  }

  let metadata = new Map<string, TestMetadataRow>();
  if (candidates.length > 0) {
    startedAt = performance.now();
    metadata = await fetchTestMetadata(es, scope, frameworks);
    warnIfTruncated('Test metadata query', metadata.size);
    log.info(`Fetched metadata for ${metadata.size} failing tests in ${elapsed(startedAt)}`);
  }

  for (const { row, classification } of candidates) {
    const entry = toEntry(row, metadata.get(row.testId));
    (classification === 'flaky' ? flaky : consistentlyFailing).push(entry);
  }

  const cap = (entries: readonly AggregatedEntry[]) => entries.slice(0, thresholds.maxTests);
  const rankedFlaky = cap(rankTests(flaky));
  const rankedConsistentlyFailing = cap(rankTests(consistentlyFailing));
  const admitted = [...rankedFlaky, ...rankedConsistentlyFailing];

  // The per-test lookups are independent, so they run concurrently and each logs its own time
  const timed = async <T>(label: string, lookup: Promise<T>): Promise<T> => {
    const lookupStartedAt = performance.now();
    const result = await lookup;
    log.info(`Fetched ${label} for ${admitted.length} tests in ${elapsed(lookupStartedAt)}`);
    return result;
  };

  let branchStats = new Map<string, FlakyTestBranchStats[]>();
  let samples = new Map<string, TestFailureSamples>();
  let trends = new Map<string, FlakyTestTrend>();
  let pipelineStats = new Map<string, FlakyTestPipelineStats[]>();
  if (admitted.length > 0) {
    [branchStats, samples, trends, pipelineStats] = await Promise.all([
      timed('per-branch stats', fetchBranchStats(es, scope, admitted)),
      timed(
        'failure samples',
        fetchSampleFailures(
          es,
          scope,
          admitted.map((entry) => entry.testId),
          options.samplesPerTest
        )
      ),
      timed(
        `${options.trendDays}-day trends`,
        fetchDailyTrend(es, scope, admitted, options.trendDays)
      ),
      timed('per-pipeline stats', fetchFilePipelineStats(es, scope, admitted)),
    ]);
  }

  const decorate = (entry: AggregatedEntry): FlakyTestEntry => ({
    ...entry,
    suiteTitle: samples.get(entry.testId)?.suiteTitle,
    latestRun: latestRunAcrossBranches(branchStats.get(entry.testId)),
    byBranch: branchStats.get(entry.testId) ?? [],
    sampleFailures: samples.get(entry.testId)?.failures ?? [],
    trend: trends.get(entry.testId),
  });

  // One file entry per (path, framework) over the tests of both lists, in ranking order
  const files = new Map<string, FlakyTestFileStats>();
  for (const { filePath, framework, testId } of admitted) {
    const key = `${framework}\n${filePath}`;
    const file = files.get(key) ?? {
      filePath,
      framework,
      testIds: [],
      byPipeline: pipelineStats.get(filePath) ?? [],
    };
    file.testIds.push(testId);
    files.set(key, file);
  }

  const flakyByFramework: Partial<Record<TestFramework, number>> = {};
  for (const entry of rankedFlaky) {
    flakyByFramework[entry.framework] = (flakyByFramework[entry.framework] ?? 0) + 1;
  }

  return FlakyTestReportSchema.parse({
    schemaVersion: FLAKY_TEST_REPORT_SCHEMA_VERSION,
    generatedAt: new Date(),
    window: { lookbackDays: options.lookbackDays, from, to },
    scope: {
      pipelines: options.pipelines,
      branches: options.branches,
      frameworks,
      classifications: options.classifications,
    },
    thresholds,
    summary: {
      totalFlaky: rankedFlaky.length,
      totalConsistentlyFailing: rankedConsistentlyFailing.length,
      flakyByFramework,
    },
    flaky: rankedFlaky.map(decorate),
    consistentlyFailing: rankedConsistentlyFailing.map(decorate),
    files: [...files.values()],
  });
};

/** Flaky test report backed by the Scout test events data stream, mirroring `ScoutTestConfigStats`. */
export class ScoutFlakyTests {
  constructor(public data: FlakyTestReport) {}

  writeToFile(outputPath: string): void {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(this.data, null, 2));
  }

  static fromFile(reportPath: string): ScoutFlakyTests {
    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Failed while trying to parse flaky tests file: path ${reportPath} does not exist`
      );
    }

    return new ScoutFlakyTests(
      FlakyTestReportSchema.parse(JSON.parse(fs.readFileSync(reportPath, 'utf8')))
    );
  }

  static async fromElasticsearch(
    es: ESClient,
    options: FlakyTestReportOptions,
    log: ToolingLog
  ): Promise<ScoutFlakyTests> {
    return new ScoutFlakyTests(await buildReport(es, options, log));
  }
}
