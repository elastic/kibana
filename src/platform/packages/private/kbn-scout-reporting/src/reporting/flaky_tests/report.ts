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
import {
  ESQL_ROW_LIMIT,
  fetchFailingFiles,
  fetchLatestRuns,
  fetchSampleFailures,
  fetchTestMetadata,
  fetchTestStats,
  type FlakyTestQueryScope,
  type TestMetadataRow,
  type TestStatsRow,
} from './queries';
import {
  FLAKY_TEST_REPORT_SCHEMA_VERSION,
  FlakyTestReportSchema,
  TEST_FRAMEWORKS,
  type FlakyTestEntry,
  type FlakyTestLatestRun,
  type FlakyTestReport,
  type FlakyTestReportThresholds,
  type TestFramework,
} from './schema';

export interface FlakyTestReportOptions {
  lookbackDays: number;
  pipelines: string[];
  branches: string[];
  frameworks: TestFramework[];
  thresholds: FlakyTestReportThresholds;
  samplesPerTest: number;
  /** Upper bound of the window; defaults to the current time. */
  now?: Date;
}

export const DEFAULT_FLAKY_TEST_REPORT_OPTIONS: Omit<FlakyTestReportOptions, 'now'> = {
  lookbackDays: 7,
  pipelines: ['kibana-on-merge'],
  branches: [],
  frameworks: [...TEST_FRAMEWORKS],
  thresholds: {
    minBuilds: 10,
    minFailedBuilds: 2,
    maxTests: 200,
  },
  samplesPerTest: 3,
};

export type FlakyTestClassification = 'flaky' | 'consistently-failing';

/**
 * A test qualifies when it ran and failed in enough builds. It is flaky when it also had at
 * least one clean pass or recovered on an in-run retry; otherwise it is simply broken.
 */
export const classifyTest = (
  stats: Pick<TestStatsRow, 'runs' | 'fails' | 'retryFlakes' | 'builds' | 'failedBuilds'>,
  thresholds: Pick<FlakyTestReportThresholds, 'minBuilds' | 'minFailedBuilds'>
): FlakyTestClassification | undefined => {
  if (stats.builds < thresholds.minBuilds || stats.failedBuilds < thresholds.minFailedBuilds) {
    return undefined;
  }

  const passes = stats.runs - stats.fails;
  return passes > 0 || stats.retryFlakes > 0 ? 'flaky' : 'consistently-failing';
};

/** Most failed builds first; ties broken by build failure rate, then by most recent failure. */
export const rankTests = <
  T extends Pick<FlakyTestEntry, 'failedBuilds' | 'buildFailRate' | 'lastFailedAt'>
>(
  entries: readonly T[]
): T[] =>
  [...entries].sort(
    (a, b) =>
      b.failedBuilds - a.failedBuilds ||
      b.buildFailRate - a.buildFailRate ||
      b.lastFailedAt.getTime() - a.lastFailedAt.getTime()
  );

/** An entry before the per-test lookups (latest run, failure samples) are attached. */
type AggregatedEntry = Omit<FlakyTestEntry, 'latestRun' | 'sampleFailures'>;

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
 * per-test execution and build counts scoped to those files, then decorate the tests that clear
 * the thresholds with metadata and recent failure samples.
 */
const buildReport = async (
  es: ESClient,
  options: FlakyTestReportOptions,
  log: ToolingLog
): Promise<FlakyTestReport> => {
  if (!Number.isInteger(options.lookbackDays) || options.lookbackDays < 1) {
    throw new Error(`lookbackDays must be a positive integer, got ${options.lookbackDays}`);
  }

  const { thresholds, frameworks } = options;
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
  log.info(`Found ${failingFiles.length} files with failures in ${elapsed(startedAt)}`);

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
      } files in ${elapsed(startedAt)}`
    );
    stats.push(...rows);
  }

  const flaky: AggregatedEntry[] = [];
  const consistentlyFailing: AggregatedEntry[] = [];
  const candidates = stats.filter((row) => classifyTest(row, thresholds) !== undefined);

  let metadata = new Map<string, TestMetadataRow>();
  if (candidates.length > 0) {
    startedAt = performance.now();
    metadata = await fetchTestMetadata(es, scope, frameworks);
    warnIfTruncated('Test metadata query', metadata.size);
    log.info(`Fetched metadata for ${metadata.size} failing tests in ${elapsed(startedAt)}`);
  }

  for (const row of candidates) {
    const entry = toEntry(row, metadata.get(row.testId));
    if (classifyTest(row, thresholds) === 'flaky') {
      flaky.push(entry);
    } else {
      consistentlyFailing.push(entry);
    }
  }

  const rankedFlaky = rankTests(flaky).slice(0, thresholds.maxTests);
  const rankedConsistentlyFailing = rankTests(consistentlyFailing).slice(0, thresholds.maxTests);
  const admitted = [...rankedFlaky, ...rankedConsistentlyFailing];

  let latestRuns = new Map<string, FlakyTestLatestRun>();
  let samples = new Map<string, FlakyTestEntry['sampleFailures']>();
  if (admitted.length > 0) {
    const admittedIds = admitted.map((entry) => entry.testId);
    startedAt = performance.now();
    [latestRuns, samples] = await Promise.all([
      fetchLatestRuns(es, scope, admittedIds),
      fetchSampleFailures(es, scope, admittedIds, options.samplesPerTest),
    ]);
    log.info(
      `Fetched latest runs and failure samples for ${admitted.length} tests in ${elapsed(
        startedAt
      )}`
    );
  }

  const decorate = (entry: AggregatedEntry): FlakyTestEntry => ({
    ...entry,
    latestRun: latestRuns.get(entry.testId),
    sampleFailures: samples.get(entry.testId) ?? [],
  });

  const flakyByFramework: Partial<Record<TestFramework, number>> = {};
  for (const entry of rankedFlaky) {
    flakyByFramework[entry.framework] = (flakyByFramework[entry.framework] ?? 0) + 1;
  }

  return FlakyTestReportSchema.parse({
    schemaVersion: FLAKY_TEST_REPORT_SCHEMA_VERSION,
    generatedAt: new Date(),
    window: { lookbackDays: options.lookbackDays, from, to },
    scope: { pipelines: options.pipelines, branches: options.branches, frameworks },
    thresholds,
    summary: {
      totalFlaky: rankedFlaky.length,
      totalConsistentlyFailing: rankedConsistentlyFailing.length,
      flakyByFramework,
    },
    flaky: rankedFlaky.map(decorate),
    consistentlyFailing: rankedConsistentlyFailing.map(decorate),
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
