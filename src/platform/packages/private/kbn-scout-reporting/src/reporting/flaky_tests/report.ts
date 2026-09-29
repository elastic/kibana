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
  fetchBranchRuns,
  fetchBranchStats,
  fetchFailingFiles,
  fetchFilePipelineStats,
  fetchIncidentJobs,
  fetchSampleFailures,
  fetchTargetStats,
  fetchTestErrors,
  fetchTestMetadata,
  fetchTestStats,
  fileStatsKey,
  type BranchRun,
  type BranchRuns,
  type FlakyTestQueryScope,
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
  type FlakyTestError,
  type FlakyTestFileStats,
  type FlakyTestFlakiestBranch,
  type FlakyTestLatestRun,
  type FlakyTestPipelineStats,
  type FlakyTestReport,
  type FlakyTestSampleFailure,
  type FlakyTestReportOptions,
  type FlakyTestReportThresholds,
  type FlakyTestTargetStats,
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
 * Latest runs in a row that must have failed without passing on a retry for a test to count as
 * consistently failing. A flaky test that also fails its retry now and then rarely does so three
 * builds in a row.
 */
export const CONSISTENTLY_FAILING_RUNS = 3;

/** Runs of consecutive failed builds, each separated from the next by a pass. */
export const countEpisodes = (runs: readonly BranchRun[]): number =>
  runs.filter((run, index) => run.failed && !runs[index - 1]?.failed).length;

/** How many of the latest runs failed without passing on a retry, i.e. how long it has been broken. */
export const countTrailingHardFailures = (runs: readonly BranchRun[]): number =>
  runs.length - 1 - runs.map((run) => run.hard).lastIndexOf(false);

type QualifyingThresholds = Pick<FlakyTestReportThresholds, 'minEpisodes' | 'maxRuns'>;

export interface Qualification {
  classification: FlakyTestClassification;
  flakiestBranch: FlakyTestFlakiestBranch;
}

/**
 * How a test qualifies on one pipeline and branch, judged on its latest `maxRuns` runs there:
 * consistently failing while its latest runs failed without passing on a retry, flaky once its
 * failures came in `minEpisodes` separate episodes. A breakage or a bad stretch of builds is a
 * single episode however long it lasts, so it never passes for flakiness.
 */
export const qualifyBranch = (
  { pipeline, branch, runs: allRuns }: BranchRuns,
  { minEpisodes, maxRuns }: QualifyingThresholds
): Qualification | undefined => {
  const runs = allRuns.slice(-maxRuns);
  const failedBuilds = runs.filter((run) => run.failed).length;
  const flakiestBranch = {
    pipeline,
    branch,
    builds: runs.length,
    failedBuilds,
    buildFailRate: runs.length > 0 ? failedBuilds / runs.length : 0,
    episodes: countEpisodes(runs),
  };
  if (countTrailingHardFailures(runs) >= CONSISTENTLY_FAILING_RUNS) {
    return { classification: 'consistently-failing', flakiestBranch };
  }
  if (flakiestBranch.episodes >= minEpisodes) {
    return { classification: 'flaky', flakiestBranch };
  }
  return undefined;
};

/**
 * How the test qualifies, on the pipeline and branch that qualify it: flaky ones first, so that a
 * breakage on one branch does not hide flakiness on another, then the most episodes, then the
 * highest failure rate. Each is judged on its own so a clean one cannot dilute a flaky one.
 */
export const qualifyTest = (
  byBranch: readonly BranchRuns[],
  thresholds: QualifyingThresholds
): Qualification | undefined =>
  byBranch
    .flatMap((runs) => qualifyBranch(runs, thresholds) ?? [])
    .sort(
      (a, b) =>
        Number(a.classification !== 'flaky') - Number(b.classification !== 'flaky') ||
        b.flakiestBranch.episodes - a.flakiestBranch.episodes ||
        b.flakiestBranch.buildFailRate - a.flakiestBranch.buildFailRate
    )[0];

type Rankable = Pick<FlakyTestEntry, 'failedBuilds' | 'buildFailRate' | 'lastFailedAt'> &
  Partial<Pick<FlakyTestEntry, 'flakiestBranch'>>;

/** The rate the test qualified on; the diluted total for reports written before it existed. */
const rankingRate = (entry: Rankable): number =>
  entry.flakiestBranch?.buildFailRate ?? entry.buildFailRate;

/**
 * Most failed builds first; ties broken by the build failure rate on the flakiest branch, then
 * by most recent failure.
 */
export const compareByFailedBuilds = (a: Rankable, b: Rankable): number =>
  b.failedBuilds - a.failedBuilds ||
  rankingRate(b) - rankingRate(a) ||
  b.lastFailedAt.getTime() - a.lastFailedAt.getTime();

export const rankTests = <T extends Rankable>(entries: readonly T[]): T[] =>
  [...entries].sort(compareByFailedBuilds);

/** An entry before the per-test lookups (latest run, branch and target stats, failures) are attached. */
type AggregatedEntry = Omit<
  FlakyTestEntry,
  'latestRun' | 'byBranch' | 'byTarget' | 'sampleFailures' | 'errors'
>;

const toEntry = (
  stats: TestStatsRow,
  flakiestBranch: FlakyTestFlakiestBranch,
  metadata: TestMetadataRow | undefined
): AggregatedEntry => ({
  testId: stats.testId,
  framework: stats.framework,
  title: metadata?.title ?? '(unknown)',
  suiteTitle: metadata?.suiteTitle,
  filePath: metadata?.filePath ?? '(unknown)',
  configPath: metadata?.configPath,
  configCategory: metadata?.configCategory,
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
  flakiestBranch,
  firstFailedAt: stats.firstFailedAt,
  lastFailedAt: stats.lastFailedAt,
});

/** Number of tests per branch they qualified on, largest count first. */
export const countByFlakiestBranch = (
  entries: ReadonlyArray<{ flakiestBranch?: Pick<FlakyTestFlakiestBranch, 'branch'> }>
): Record<string, number> => {
  const counts = new Map<string, number>();
  for (const { flakiestBranch } of entries) {
    if (!flakiestBranch) continue;
    counts.set(flakiestBranch.branch, (counts.get(flakiestBranch.branch) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([, a], [, b]) => b - a));
};

/** `main: 167, 9.5: 19` */
export const formatCounts = (counts: Readonly<Partial<Record<string, number>>>): string =>
  Object.entries(counts)
    .filter(([, count]) => count !== undefined)
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');

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
 * per-test execution and build counts scoped to those files, check the thresholds branch by
 * branch, then decorate the highest ranked ones with metadata, per-branch and per-pipeline
 * stats and recent failure samples.
 */
const buildReport = async (
  es: ESClient,
  options: FlakyTestReportOptions,
  log: ToolingLog
): Promise<FlakyTestReport> => {
  if (!Number.isInteger(options.lookbackDays) || options.lookbackDays < 1) {
    throw new Error(`lookbackDays must be a positive integer, got ${options.lookbackDays}`);
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

  // Totals are a cheap first cut: a branch never has more failed builds than the total, and a
  // test needs as many to show that many episodes or hard failures in a row
  const minFailedBuilds = Math.min(thresholds.minEpisodes, CONSISTENTLY_FAILING_RUNS);
  const candidates = stats.filter((row) => row.failedBuilds >= minFailedBuilds);

  // The thresholds proper apply per pipeline and branch, before ranking, so the caps are filled
  // with tests that qualify on one of them rather than only in the diluted total
  const qualified: Array<{ row: TestStatsRow } & Qualification> = [];
  if (candidates.length > 0) {
    startedAt = performance.now();
    const incidentJobs = await fetchIncidentJobs(
      es,
      scope,
      frameworks,
      thresholds.incidentFailures
    );
    const branchRuns = await fetchBranchRuns(es, scope, candidates, incidentJobs);
    let belowThresholds = 0;
    for (const row of candidates) {
      const qualification = qualifyTest(branchRuns.get(row.testId) ?? [], thresholds);
      if (!qualification) {
        belowThresholds += 1;
      } else if (classifications.has(qualification.classification)) {
        qualified.push({ row, ...qualification });
      }
    }
    const qualifiedByBranch = countByFlakiestBranch(qualified);
    log.info(
      `Checked ${candidates.length} tests branch by branch in ${elapsed(startedAt)}, leaving out ` +
        `${incidentJobs.length} incident jobs: ${qualified.length} qualify ` +
        `(${formatCounts(qualifiedByBranch) || 'none'}), ` +
        `${belowThresholds} clear the thresholds on no single pipeline and branch`
    );
  }

  let metadata = new Map<string, TestMetadataRow>();
  if (qualified.length > 0) {
    startedAt = performance.now();
    metadata = await fetchTestMetadata(es, scope, frameworks);
    warnIfTruncated('Test metadata query', metadata.size);
    log.info(`Fetched metadata for ${metadata.size} failing tests in ${elapsed(startedAt)}`);
  }

  const flaky: AggregatedEntry[] = [];
  const consistentlyFailing: AggregatedEntry[] = [];
  for (const { row, classification, flakiestBranch } of qualified) {
    const entry = toEntry(row, flakiestBranch, metadata.get(row.testId));
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
  let targetStats = new Map<string, FlakyTestTargetStats[]>();
  let samples = new Map<string, FlakyTestSampleFailure[]>();
  let errors = new Map<string, FlakyTestError[]>();
  let pipelineStats = new Map<string, FlakyTestPipelineStats[]>();
  if (admitted.length > 0) {
    [branchStats, targetStats, samples, errors, pipelineStats] = await Promise.all([
      timed('per-branch stats', fetchBranchStats(es, scope, admitted)),
      timed('per-target stats', fetchTargetStats(es, scope, admitted)),
      timed(
        'failure samples',
        fetchSampleFailures(
          es,
          scope,
          admitted.map((entry) => entry.testId),
          options.samplesPerTest
        )
      ),
      timed('distinct errors', fetchTestErrors(es, scope, admitted)),
      timed('per-pipeline stats', fetchFilePipelineStats(es, scope, admitted)),
    ]);
  }

  const decorate = (entry: AggregatedEntry): FlakyTestEntry => ({
    ...entry,
    latestRun: latestRunAcrossBranches(branchStats.get(entry.testId)),
    byBranch: branchStats.get(entry.testId) ?? [],
    byTarget: targetStats.get(entry.testId) ?? [],
    sampleFailures: samples.get(entry.testId) ?? [],
    errors: errors.get(entry.testId) ?? [],
  });

  // One file entry per (path, framework) over the tests of both lists, in ranking order
  const files = new Map<string, FlakyTestFileStats>();
  for (const { filePath, framework, testId } of admitted) {
    const key = fileStatsKey(framework, filePath);
    const file = files.get(key) ?? {
      filePath,
      framework,
      testIds: [],
      byPipeline: pipelineStats.get(key) ?? [],
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
      flakyByBranch: countByFlakiestBranch(rankedFlaky),
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
