/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import {
  scopeKey,
  type FlakyTestReport,
  type JudgedScope,
  type TestFramework,
} from '@kbn/scout-reporting';
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  BUILDKITE_ORG_URL,
  buildkiteJobUrl,
  CATEGORY_LABELS,
  codeBlock,
  collapsed,
  formatBuildLink,
  formatFailedBranches,
  formatDateRange,
  formatDay,
  formatFailedBuilds,
  formatFullFailureMessage,
  formatPercent,
  formatScope,
  FRAMEWORK_LABELS,
  inlineCode,
  isFlakyBranch,
  isPullRequestRef,
  KIBANA_BLOB_URL,
  pipelineTargetEnvironment,
  plural,
  table,
  testsTable,
  type BranchThresholds,
} from './markdown';
import type { FlakySuite } from './suites';

/** Namespace of the hidden `kibanaCiData` block at the end of the issue body and comments. */
export const FLAKY_TEST_SUITE_METADATA_PREFIX = 'flaky-test-suite';

const MAX_TEST_ROWS = 15;
/** Distinct errors shown; a suite with more gets a count of the rest. */
const MAX_ERRORS = 4;
/** GitHub rejects longer issue titles with a 422. */
const MAX_TITLE_LENGTH = 256;
/** Report snapshots kept in the metadata, about a month of daily reports. */
const MAX_REPORT_HISTORY = 30;

export interface FlakySuiteIssueContext {
  report: FlakyTestReport;
  /** Numbers of issues that mention the suite's file without being about it. */
  relatedIssues?: number[];
  /**
   * Numbers of closed issues about one of the suite's tests that failed after they were closed,
   * which this issue takes over from.
   */
  supersededIssues?: number[];
}

export interface FlakySuiteIssueRefreshContext {
  report: FlakyTestReport;
  /** Metadata of the issue being refreshed, merged into the new one. */
  previous: RecordedFlakySuiteIssueMetadata;
  /** The refresh posts this report's numbers as a comment, recorded as `report.commentedAt`. */
  comment: boolean;
}

export interface FlakySuiteIssueCommentContext {
  report: FlakyTestReport;
  /** The issue is being reopened: the suite failed again after it was closed. */
  reopened: boolean;
  /** Metadata of the issue before this refresh, for the flaky tests it has not shown yet. */
  previous?: RecordedFlakySuiteIssueMetadata;
}

/** One report's numbers for the suite's worst test, kept in the body so the history survives. */
export interface FlakySuiteReportSnapshot {
  generatedAt: string;
  builds: number;
  failedBuilds: number;
}

export interface FlakySuiteIssueMetadata {
  'suite.filePath': string;
  /** Absent when the report knows no suite title, the issue is then about the whole file. */
  'suite.title'?: string;
  'suite.framework': string;
  'suite.testIds': string[];
  /**
   * Branches in the report scope that a test of the suite failed on, most failed builds first and
   * pull requests left out: the branches `/skip` (elastic/kibana-operations `triage/`) skips it on.
   */
  'suite.branches': string[];
  /**
   * Pipelines in the report scope that the suite's file failed on, latest failure last, the order
   * the failed-test alerts of `triage/` read them in.
   */
  'suite.pipelines': string[];
  /** Newest report that found the suite flaky. */
  'report.generatedAt': string;
  /** Reports that found the suite flaky, including the one that filed the issue. */
  'report.count': number;
  /** One snapshot per report that found the suite flaky, oldest first. */
  'report.history': FlakySuiteReportSnapshot[];
  /**
   * Newest report whose numbers were posted as a comment; absent until the first comment, while
   * the body as filed is all the owners have seen. Refreshes comment at most every few days from
   * it.
   */
  'report.commentedAt'?: string;
  /**
   * Tests the owners have seen flaky on the issue: those of the body as filed and of every comment
   * since. The next comment names the flaky tests missing from it; absent on issues filed before
   * it was recorded, until their next comment.
   */
  'report.shownTestIds'?: string[];
}

/** What an issue body records; older issues lack some of it. */
export type RecordedFlakySuiteIssueMetadata = Pick<
  FlakySuiteIssueMetadata,
  'suite.filePath' | 'report.history'
> &
  Partial<FlakySuiteIssueMetadata>;

const metadataValue = (body: string, key: keyof FlakySuiteIssueMetadata): unknown =>
  getIssueMetadata(body, key, undefined, FLAKY_TEST_SUITE_METADATA_PREFIX);

const isSnapshot = (value: unknown): value is FlakySuiteReportSnapshot =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FlakySuiteReportSnapshot).generatedAt === 'string' &&
  typeof (value as FlakySuiteReportSnapshot).builds === 'number' &&
  typeof (value as FlakySuiteReportSnapshot).failedBuilds === 'number';

const stringsOf = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

/** Suite metadata recorded in an issue body, if the body was written by this reporter. */
export const readFlakySuiteIssueMetadata = (
  body: string
): RecordedFlakySuiteIssueMetadata | undefined => {
  const filePath = metadataValue(body, 'suite.filePath');
  if (typeof filePath !== 'string') {
    return undefined;
  }
  const title = metadataValue(body, 'suite.title');
  const framework = metadataValue(body, 'suite.framework');
  const generatedAt = metadataValue(body, 'report.generatedAt');
  const count = metadataValue(body, 'report.count');
  const history = metadataValue(body, 'report.history');
  const commentedAt = metadataValue(body, 'report.commentedAt');
  return {
    'suite.filePath': filePath,
    'suite.title': typeof title === 'string' ? title : undefined,
    'suite.framework': typeof framework === 'string' ? framework : undefined,
    'suite.testIds': stringsOf(metadataValue(body, 'suite.testIds')),
    'suite.branches': stringsOf(metadataValue(body, 'suite.branches')),
    'suite.pipelines': stringsOf(metadataValue(body, 'suite.pipelines')),
    'report.generatedAt': typeof generatedAt === 'string' ? generatedAt : undefined,
    'report.count': typeof count === 'number' ? count : undefined,
    'report.history': Array.isArray(history) ? history.filter(isSnapshot) : [],
    'report.commentedAt': typeof commentedAt === 'string' ? commentedAt : undefined,
    'report.shownTestIds': stringsOf(metadataValue(body, 'report.shownTestIds')),
  };
};

/**
 * Newest report the owners can see on the issue: the latest comment or, before any comment, the
 * report that filed it, the oldest kept in the history.
 */
export const lastPostedAt = (metadata: RecordedFlakySuiteIssueMetadata): string | undefined =>
  metadata['report.commentedAt'] ?? metadata['report.history'][0]?.generatedAt;

const snapshot = (suite: FlakySuite, report: FlakyTestReport): FlakySuiteReportSnapshot => ({
  generatedAt: report.generatedAt.toISOString(),
  builds: suite.tests[0].builds,
  failedBuilds: suite.tests[0].failedBuilds,
});

/**
 * Branches a test of the suite failed on, by the worst test's failed builds on each; a pull request
 * has no branch of `elastic/kibana` to skip the suite on.
 */
const failedBranches = (suite: FlakySuite): string[] => {
  const failedBuilds = new Map<string, number>();
  for (const test of suite.tests) {
    for (const { branch, failedBuilds: failed } of test.byBranch) {
      if (failed > 0 && !isPullRequestRef(branch)) {
        failedBuilds.set(branch, Math.max(failedBuilds.get(branch) ?? 0, failed));
      }
    }
  }
  return [...failedBuilds.entries()]
    .sort(([branchA, a], [branchB, b]) => b - a || branchA.localeCompare(branchB))
    .map(([branch]) => branch);
};

/** Pipelines of the report scope the suite's file failed on, the most recent failure last. */
const failedPipelines = (suite: FlakySuite, { scope }: FlakyTestReport): string[] =>
  suite.byPipeline
    .filter(
      ({ pipeline, failedBuilds }) =>
        failedBuilds > 0 && (scope.pipelines.length === 0 || scope.pipelines.includes(pipeline))
    )
    .sort(
      (a, b) =>
        (a.lastFailedAt?.getTime() ?? 0) - (b.lastFailedAt?.getTime() ?? 0) ||
        a.pipeline.localeCompare(b.pipeline)
    )
    .map(({ pipeline }) => pipeline);

/** `current` followed by the values only `previous` has. */
const union = (current: readonly string[], previous: readonly string[] = []): string[] => [
  ...new Set([...current, ...previous]),
];

/**
 * Metadata of a freshly filed issue, or of a refreshed one when `previous` is given: the test ids
 * and branches it recorded are kept, so `/skip` still covers a branch the suite stopped failing on
 * this week, and pipelines it no longer fails on move first, keeping the latest failure last.
 */
export const flakySuiteIssueMetadata = (
  suite: FlakySuite,
  report: FlakyTestReport,
  previous?: RecordedFlakySuiteIssueMetadata,
  comment = false
): FlakySuiteIssueMetadata => {
  const pipelines = failedPipelines(suite, report);
  const history = [...(previous?.['report.history'] ?? []), snapshot(suite, report)];
  const commentedAt = comment ? report.generatedAt.toISOString() : previous?.['report.commentedAt'];
  const testIds = suite.tests.map((test) => test.testId);
  // a new issue shows its tests in the body, a refresh's comment only those flaky where it says
  const shownNow = previous ? commentedTestIds(suite, report.thresholds) : testIds;
  const shownTestIds =
    !previous || comment
      ? union(shownNow, previous?.['report.shownTestIds'])
      : previous['report.shownTestIds'];
  return {
    'suite.filePath': suite.filePath,
    ...(suite.suiteTitle ? { 'suite.title': suite.suiteTitle } : {}),
    'suite.framework': suite.framework,
    'suite.testIds': union(testIds, previous?.['suite.testIds']),
    'suite.branches': union(failedBranches(suite), previous?.['suite.branches']),
    'suite.pipelines': [
      ...(previous?.['suite.pipelines'] ?? []).filter((pipeline) => !pipelines.includes(pipeline)),
      ...pipelines,
    ],
    'report.generatedAt': report.generatedAt.toISOString(),
    // Issues filed before the count was recorded had one report per snapshot, and consistently
    // failing issues have none
    'report.count': previous
      ? (previous['report.count'] ?? previous['report.history'].length) + 1
      : 1,
    'report.history': history.slice(-MAX_REPORT_HISTORY),
    ...(commentedAt ? { 'report.commentedAt': commentedAt } : {}),
    ...(shownTestIds ? { 'report.shownTestIds': shownTestIds } : {}),
  };
};

/**
 * What the title says between the framework and "suite": `UI` or `API` for Scout and FTR,
 * `integration` for Jest integration tests, nothing where the category is implied by the
 * framework (Jest unit tests, Cypress) or unknown.
 */
const titleCategory = (
  framework: TestFramework,
  configCategory: string | undefined
): string | undefined => {
  if (framework === 'jest') {
    return configCategory === 'unit-integration-test' ? 'integration' : undefined;
  }
  if (framework === 'cypress') {
    return undefined;
  }
  return configCategory === 'ui-test' || configCategory === 'api-test'
    ? CATEGORY_LABELS[configCategory]
    : undefined;
};

/**
 * `<Adjective> Scout API suite: Lens ESQL dashboard inline editing`, or the file name without a
 * suite title. Display only; issues are matched on their metadata, never on the title.
 */
export const suiteIssueTitle = (
  adjective: 'Flaky' | 'Failing',
  suite: Pick<FlakySuite, 'filePath' | 'framework' | 'suiteTitle' | 'configCategory'>
): string => {
  const subject = suite.suiteTitle ?? Path.basename(suite.filePath);
  const category = titleCategory(suite.framework, suite.configCategory);
  const lead = `${adjective} ${FRAMEWORK_LABELS[suite.framework].short}${
    category ? ` ${category}` : ''
  } suite: `;
  // Nested describe blocks can join into a subject longer than GitHub accepts for a title
  const room = MAX_TITLE_LENGTH - lead.length;
  return lead + (subject.length > room ? `${subject.slice(0, room - 1)}…` : subject);
};

export const flakySuiteIssueTitle = (
  suite: Pick<FlakySuite, 'filePath' | 'framework' | 'suiteTitle' | 'configCategory'>
): string => suiteIssueTitle('Flaky', suite);

/** `Skipped on \`main\` since 2026-09-09.` when the latest run of the worst test was a skip. */
const skippedNote = (suite: FlakySuite): string | undefined => {
  const { latestRun } = suite.tests[0];
  if (latestRun?.status !== 'skipped') {
    return undefined;
  }
  const since = latestRun.timestamp.toISOString().slice(0, 10);
  return `Latest run on ${inlineCode(latestRun.branch)} was skipped (${since}).`;
};

/** `3 tests in the [\`Default status alert\`](…/default_status_alert.spec.ts) suite appear to be flaky:` */
const opening = (suite: FlakySuite): string => {
  const subject = suite.suiteTitle ?? Path.basename(suite.filePath);
  const link = `[${inlineCode(subject)}](${KIBANA_BLOB_URL}/${suite.filePath})`;
  const count = suite.tests.length;
  return (
    `${plural(count, 'test')} in the ${link} suite ` +
    `${count === 1 ? 'appears' : 'appear'} to be flaky:`
  );
};

const blobLink = (repoRelativePath: string): string =>
  `[${inlineCode(repoRelativePath)}](${KIBANA_BLOB_URL}/${repoRelativePath})`;

const suiteDetails = (suite: FlakySuite): string => {
  const framework = FRAMEWORK_LABELS[suite.framework].long;
  const category = suite.configCategory ? CATEGORY_LABELS[suite.configCategory] : undefined;
  const rows: string[][] = [
    ['**Framework**', framework],
    ...(category ? [['**Category**', `${category} test`]] : []),
    ['**File**', blobLink(suite.filePath)],
    ...(suite.configPath ? [['**Config**', blobLink(suite.configPath)]] : []),
    ['**Owners**', suite.owners.length > 0 ? suite.owners.map(inlineCode).join(', ') : '-'],
  ];
  return table(['Field', 'Value'], rows);
};

/** Build counts of one test somewhere: on a branch, on a target. */
interface BuildCounts {
  builds: number;
  failedBuilds: number;
  buildFailRate: number;
  lastFailedAt?: Date;
  lastFailedBuildUrl?: string;
  lastFailedJobId?: string;
}

/** A row of a breakdown: the worst test's counts there and the test with the newest failure. */
interface WorstFailures<T extends BuildCounts> {
  worst: T;
  /** Absent when no test failed there. */
  latest?: T;
}

/**
 * The suite's tests folded into one row per key: the worst test's counts rather than a sum over
 * tests, as one build failing several tests would otherwise count several times. Failing rows
 * first, then by rate, then by key.
 */
const worstPerKey = <T extends BuildCounts>(
  suite: FlakySuite,
  rowsOf: (test: FlakySuite['tests'][number]) => readonly T[],
  keyOf: (row: T) => string
): Array<WorstFailures<T>> => {
  const byKey = new Map<string, WorstFailures<T>>();
  for (const test of suite.tests) {
    for (const stats of rowsOf(test)) {
      const key = keyOf(stats);
      const current = byKey.get(key);
      const worst =
        !current ||
        stats.failedBuilds > current.worst.failedBuilds ||
        (stats.failedBuilds === current.worst.failedBuilds && stats.builds > current.worst.builds)
          ? stats
          : current.worst;
      const latest =
        stats.lastFailedAt &&
        (!current?.latest?.lastFailedAt || stats.lastFailedAt > current.latest.lastFailedAt)
          ? stats
          : current?.latest;
      byKey.set(key, { worst, latest });
    }
  }
  return [...byKey.entries()]
    .sort(
      ([keyA, a], [keyB, b]) =>
        Number(b.worst.failedBuilds > 0) - Number(a.worst.failedBuilds > 0) ||
        b.worst.buildFailRate - a.worst.buildFailRate ||
        keyA.localeCompare(keyB)
    )
    .map(([, row]) => row);
};

/** A branch where every setup skips every test of the suite, and when one of them last ran there. */
interface BranchSkip {
  lastRanAt?: Date;
}

/**
 * `49 / 509 (10%) | [#12345](…#job) · 2026-09-09 06:12 UTC`, or `0 / 58 |` for a clean row.
 * Reports written before the build was recorded get the time alone.
 */
const failuresCells = ({ worst, latest }: WorstFailures<BuildCounts>): string[] => [
  worst.failedBuilds > 0 ? formatFailedBuilds(worst) : `0 / ${worst.builds}`,
  latest
    ? formatBuildLink(
        { buildUrl: latest.lastFailedBuildUrl, jobId: latest.lastFailedJobId },
        latest.lastFailedAt
      )
    : '',
];

/** What the suite does on a branch, in the order the branch table lists them. */
const BRANCH_STATUSES = ['flaky', 'failing', 'skipped', 'clean'] as const;
type BranchStatus = (typeof BRANCH_STATUSES)[number];

/**
 * Branches where any test of the suite clears the report's thresholds, as in the tests table, by
 * `scopeKey`: a pipeline judged on its own is told apart from the same branch of the others.
 */
const flakyBranches = (suite: FlakySuite, thresholds: BranchThresholds): Set<string> =>
  new Set(
    suite.tests.flatMap((test) =>
      test.byBranch.filter((stats) => isFlakyBranch(stats, thresholds)).map(scopeKey)
    )
  );

const branchStatus = (worst: BuildCounts, flaky: boolean, skip?: BranchSkip): BranchStatus => {
  if (skip) {
    return 'skipped';
  }
  if (flaky) {
    return 'flaky';
  }
  return worst.failedBuilds > 0 ? 'failing' : 'clean';
};

const branchStatusLabel = (status: BranchStatus, skip?: BranchSkip): string => {
  switch (status) {
    case 'flaky':
      return '🔴 Flaky';
    case 'failing':
      return '🟠 Some failures';
    case 'skipped':
      return skip?.lastRanAt
        ? `⏭️ Skipped, last ran ${formatDay(skip.lastRanAt)}`
        : '⏭️ Skipped in every run';
    case 'clean':
      return '✅ No failures';
  }
};

const latestOf = (a: Date | undefined, b: Date | undefined): Date | undefined =>
  a && b ? (a > b ? a : b) : a ?? b;

/** The branches where every setup skips every test of the suite, by `scopeKey`. */
const branchSkips = (suite: FlakySuite): Map<string, BranchSkip> => {
  const byBranch = new Map<string, BranchSkip & { skipped: boolean }>();
  for (const test of suite.tests) {
    for (const stats of test.byBranch) {
      const key = scopeKey(stats);
      const current = byBranch.get(key);
      byBranch.set(key, {
        skipped: (current?.skipped ?? true) && stats.skipped === true,
        lastRanAt: latestOf(current?.lastRanAt, stats.latestExecutionAt),
      });
    }
  }
  return new Map(
    [...byBranch]
      .filter(([, { skipped }]) => skipped)
      .map(([branch, { lastRanAt }]) => [branch, { lastRanAt }])
  );
};

/** `main` or a version branch like `9.4`; feature and pull request branches are not. */
const isMainOrVersionBranch = (branch: string): boolean =>
  branch === 'main' || /^\d+\.\d+$/.test(branch);

/** Whether the suite is flaky, fails, is skipped or is clean on `main` and each version branch. */
const statusByBranch = (suite: FlakySuite, { thresholds }: FlakyTestReport): string | undefined => {
  const skipped = branchSkips(suite);
  const flaky = flakyBranches(suite, thresholds);
  // The counts shown are the worst test's, the status covers every test
  const branches = worstPerKey(
    suite,
    (test) => test.byBranch.filter(({ branch }) => isMainOrVersionBranch(branch)),
    (stats) => scopeKey(stats)
  ).map((row) => {
    const key = scopeKey(row.worst);
    const skip = skipped.get(key);
    return { row, skip, status: branchStatus(row.worst, flaky.has(key), skip) };
  });
  if (branches.length === 0) {
    return undefined;
  }
  const rows = branches
    .sort((a, b) => BRANCH_STATUSES.indexOf(a.status) - BRANCH_STATUSES.indexOf(b.status))
    .map(({ row, skip, status }) => [
      formatScope(row.worst),
      branchStatusLabel(status, skip),
      ...failuresCells(row),
    ]);
  return [
    '#### Status by Branch',
    '',
    table(['Branch', 'Status', 'Failed builds', 'Sample failure'], rows),
  ].join('\n');
};

/** What frameworks without a Scout target (Jest, FTR, Cypress) record as the target mode. */
const UNKNOWN_TARGET_MODE = 'unknown';

/**
 * Which Scout targets the suite fails on and which it does not, with where each ran (local
 * deployment or serverless simulation, ECH, MKI). Runs that recorded no target are left out, so
 * the table only appears for suites that have one.
 */
const failuresByTarget = (suite: FlakySuite): string | undefined => {
  const targets = worstPerKey(
    suite,
    (test) => test.byTarget.filter((stats) => stats.mode !== UNKNOWN_TARGET_MODE),
    // a pipeline judged on its own, such as FIPS, has rows of its own for the same targets
    (stats) => [stats.mode, stats.type, stats.pipeline ?? ''].join(' · ')
  );
  if (targets.length === 0) {
    return undefined;
  }
  const rows = targets.map((row) => [
    `${row.worst.failedBuilds > 0 ? '🔴' : '✅'} ${inlineCode(row.worst.mode)}`,
    pipelineTargetEnvironment(row.worst),
    ...failuresCells(row),
  ]);
  return [
    '#### Failures by Target',
    '',
    table(['Target', 'Environment', 'Failed builds', 'Sample failure'], rows),
  ].join('\n');
};

/** Error titles in a summary line are cut beyond this many characters. */
const MAX_ERROR_TITLE_LENGTH = 110;

/** One error of the suite, merged over the tests that hit it. */
interface SuiteError {
  key: string;
  /** The newest failure's message across the tests. */
  message: string;
  /** Build ids per pipeline; a build failing two tests counts once. */
  byPipeline: Map<string, Set<string>>;
  branches: Set<string>;
  targets: Set<string>;
  /** Titles of the tests that hit the error, in ranking order. */
  tests: string[];
  firstFailedAt: Date;
  lastFailedAt: Date;
  lastFailedBuildUrl?: string;
  lastFailedJobId?: string;
}

/** Distinct builds with the error; a build belongs to one pipeline, so the counts add up. */
const errorBuilds = (error: SuiteError): number =>
  [...error.byPipeline.values()].reduce((sum, builds) => sum + builds.size, 0);

/** The errors of every test in the suite, merged on the report's key, most builds first. */
const suiteErrors = (suite: FlakySuite): SuiteError[] => {
  const byKey = new Map<string, SuiteError>();
  for (const test of suite.tests) {
    for (const error of test.errors) {
      const current = byKey.get(error.key);
      if (!current) {
        byKey.set(error.key, {
          key: error.key,
          message: error.message,
          byPipeline: new Map(
            error.byPipeline.map(({ pipeline, buildIds }) => [pipeline, new Set(buildIds)])
          ),
          branches: new Set(error.branches),
          targets: new Set(error.targets),
          tests: [test.title],
          firstFailedAt: error.firstFailedAt,
          lastFailedAt: error.lastFailedAt,
          lastFailedBuildUrl: error.lastFailedBuildUrl,
          lastFailedJobId: error.lastFailedJobId,
        });
        continue;
      }
      for (const { pipeline, buildIds } of error.byPipeline) {
        current.byPipeline.set(
          pipeline,
          new Set([...(current.byPipeline.get(pipeline) ?? []), ...buildIds])
        );
      }
      for (const branch of error.branches) current.branches.add(branch);
      for (const target of error.targets) current.targets.add(target);
      current.tests.push(test.title);
      if (error.firstFailedAt < current.firstFailedAt) {
        current.firstFailedAt = error.firstFailedAt;
      }
      if (error.lastFailedAt > current.lastFailedAt) {
        current.lastFailedAt = error.lastFailedAt;
        current.message = error.message;
        current.lastFailedBuildUrl = error.lastFailedBuildUrl;
        current.lastFailedJobId = error.lastFailedJobId;
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) => errorBuilds(b) - errorBuilds(a) || a.key.localeCompare(b.key)
  );
};

/**
 * `Error: expect(received).toStrictEqual(expected) // deep equality`: the message's first line,
 * without the JSON payload Kibana client errors append, cut to fit a summary line.
 */
const errorTitle = (message: string): string => {
  const first = formatFullFailureMessage(message)
    .split('\n')[0]
    .replace(/ -- \{.*$/, '')
    .trim();
  return first.length > MAX_ERROR_TITLE_LENGTH
    ? `${first.slice(0, MAX_ERROR_TITLE_LENGTH - 1).trimEnd()}…`
    : first;
};

/** Markdown does not render inside `<summary>`, so its text is HTML. */
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** `` `kibana-pull-request` (597), `kibana-on-merge` (128) ``, or `` `kibana-on-merge` only ``. */
const formatErrorPipelines = (byPipeline: Map<string, Set<string>>): string => {
  const entries = [...byPipeline.entries()]
    .map(([pipeline, builds]): [string, number] => [pipeline, builds.size])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (entries.length === 1) {
    return `${inlineCode(entries[0][0])} only`;
  }
  return entries.map(([pipeline, builds]) => `${inlineCode(pipeline)} (${builds})`).join(', ');
};

/**
 * One error, under its share of the suite's failed builds and its first line, collapsed unless
 * `open`; inside, the full message, then where it was seen.
 */
const errorSection = (
  suite: FlakySuite,
  error: SuiteError,
  failedBuilds: number,
  open: boolean
): string => {
  const builds = errorBuilds(error);
  const share = formatPercent(failedBuilds > 0 ? builds / failedBuilds : 0);
  const summary =
    `<b>${share} of failed builds</b> (${builds} of ${failedBuilds}) · ` +
    `<code>${escapeHtml(errorTitle(error.message))}</code> · ` +
    formatDateRange(error.firstFailedAt, error.lastFailedAt);
  const targets = [...error.targets].filter((target) => target !== UNKNOWN_TARGET_MODE).sort();
  const branches = [...error.branches];
  const rows: string[][] = [
    ...(suite.tests.length > 1
      ? [['**Tests**', error.tests.map((title) => `*${title}*`).join(', ')]]
      : []),
    ['**Pipelines**', formatErrorPipelines(error.byPipeline)],
    [
      '**Branches**',
      formatFailedBranches({ failedBranches: branches.length, failedBranchNames: branches }),
    ],
    ...(targets.length > 0
      ? [[`**${targets.length > 1 ? 'Targets' : 'Target'}**`, targets.map(inlineCode).join(', ')]]
      : []),
    [
      '**Last seen**',
      formatBuildLink(
        { buildUrl: error.lastFailedBuildUrl, jobId: error.lastFailedJobId },
        error.lastFailedAt
      ),
    ],
  ];
  return collapsed(
    summary,
    [codeBlock(formatFullFailureMessage(error.message)), table(['Field', 'Value'], rows)].join(
      '\n\n'
    ),
    { open }
  );
};

/**
 * An error seen on nothing but pull request builds is that pull request's, not the suite's. One
 * with no recorded branch is kept: it cannot be shown to be anyone's.
 */
const isPullRequestOnly = (error: SuiteError): boolean =>
  error.branches.size > 0 && [...error.branches].every(isPullRequestRef);

/**
 * The suite's distinct errors over the window, most builds first, at most `MAX_ERRORS` shown.
 * The first is open, so the likely cause shows without a click. Errors seen only on pull request
 * builds are left out, and the section says so, so that it describes what the suite does on real
 * branches.
 */
const failuresByErrorMessage = (suite: FlakySuite): string => {
  const all = suiteErrors(suite);
  if (all.length === 0) {
    return 'No failure messages were recorded for this suite.';
  }
  const errors = all.filter((error) => !isPullRequestOnly(error));
  const leftOut =
    errors.length < all.length
      ? '*Errors that only appeared in PR builds were excluded.*'
      : undefined;
  if (errors.length === 0) {
    return ['#### Failures by Error Message', leftOut].join('\n\n');
  }
  // A build that hit two errors counts once, so the shares can add up to more than 100%
  const failedBuilds = new Set(
    errors.flatMap((error) => [...error.byPipeline.values()].flatMap((builds) => [...builds]))
  ).size;
  const shown = errors
    .slice(0, MAX_ERRORS)
    .map((error, index) => errorSection(suite, error, failedBuilds, index === 0));
  const rest = errors.length - shown.length;
  return [
    '#### Failures by Error Message',
    `${plural(errors.length, 'distinct error')}:`,
    ...shown,
    ...(rest > 0 ? [`and ${plural(rest, 'more error')}.`] : []),
    ...(leftOut ? [leftOut] : []),
  ].join('\n\n');
};

const pipelineLink = (pipeline: string): string =>
  `[${inlineCode(pipeline)}](${BUILDKITE_ORG_URL}/${pipeline})`;

/**
 * Where else the suite fails: every pipeline and branch, not just the report scope. Rates here
 * are over all branches and say how widely it hurts, not how flaky it is; that is the table above.
 */
const failuresByPipeline = (suite: FlakySuite, report: FlakyTestReport): string | undefined => {
  if (suite.byPipeline.length === 0) {
    return undefined;
  }
  const scope =
    `Where it failed ${formatDateRange(report.window.from, report.window.to)}, across ` +
    `all pipelines and branches${suite.tests.length > 1 ? ', any of the tests above' : ''}:`;
  const rows = suite.byPipeline.map((stats) => [
    pipelineLink(stats.pipeline),
    formatFailedBuilds(stats),
    formatFailedBranches(stats),
    formatBuildLink(
      { buildUrl: stats.lastFailedBuildUrl, jobId: stats.lastFailedJobId },
      stats.lastFailedAt
    ),
  ]);
  return [
    '#### Failures by Pipeline',
    '',
    scope,
    '',
    table(['Pipeline', 'Failed builds', 'Branches', 'Sample failure'], rows),
  ].join('\n');
};

const issueList = (numbers: readonly number[]): string =>
  numbers.map((number) => `#${number}`).join(', ');

const supersededIssues = (ctx: FlakySuiteIssueContext): string | undefined =>
  ctx.supersededIssues && ctx.supersededIssues.length > 0
    ? `Previously tracked in ${issueList(
        ctx.supersededIssues
      )}, closed before the suite failed again.`
    : undefined;

const relatedIssues = (ctx: FlakySuiteIssueContext): string | undefined =>
  ctx.relatedIssues && ctx.relatedIssues.length > 0
    ? `Possibly related: ${issueList(ctx.relatedIssues)}.`
    : undefined;

/** What a report found about the suite: its flaky tests, then the failures from every angle. */
const reportSections = (suite: FlakySuite, report: FlakyTestReport): Array<string | undefined> => [
  testsTable(suite.tests, {
    withDashboardLinks: true,
    maxRows: MAX_TEST_ROWS,
    thresholds: report.thresholds,
  }),
  skippedNote(suite),
];

const failureSections = (suite: FlakySuite, report: FlakyTestReport): Array<string | undefined> => [
  failuresByErrorMessage(suite),
  statusByBranch(suite, report),
  failuresByTarget(suite),
  failuresByPipeline(suite, report),
];

const joinSections = (sections: ReadonlyArray<string | undefined>): string =>
  sections.filter((section) => section !== undefined).join('\n\n');

export const SKIP_TIP =
  '> [!TIP]\n' +
  "> Review the failures. If you'd like to skip the test, ask the #kibana-operations team " +
  'to `/skip` it, or skip the test case manually.';

/** Full issue body for a new suite issue, including the hidden metadata. */
export const renderFlakySuiteIssueBody = (suite: FlakySuite, ctx: FlakySuiteIssueContext): string =>
  updateIssueMetadata(
    joinSections([
      opening(suite),
      ...reportSections(suite, ctx.report),
      '### Suite',
      suiteDetails(suite),
      '### Failures',
      ...failureSections(suite, ctx.report),
      SKIP_TIP,
      supersededIssues(ctx),
      relatedIssues(ctx),
    ]),
    flakySuiteIssueMetadata(suite, ctx.report),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );

/**
 * The body of a refreshed issue: the text stays as filed, a record of what the suite did then,
 * and only the hidden metadata is brought up to this report, as `/skip` and the failed-test
 * alerts of elastic/kibana-operations `triage/` read the suite's tests, branches, pipelines and
 * report count from it. This report's numbers go in the comment.
 */
export const refreshFlakySuiteIssueMetadata = (
  body: string,
  suite: FlakySuite,
  { report, previous, comment }: FlakySuiteIssueRefreshContext
): string =>
  updateIssueMetadata(
    body,
    flakySuiteIssueMetadata(suite, report, previous, comment),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );

/** `[6 Nov](…#job)`, the day of the newest failure linked to its job when the build is known. */
const lastFailedLink = ({
  lastFailedAt,
  lastFailedBuildUrl,
  lastFailedJobId,
}: BuildCounts): string | undefined => {
  if (!lastFailedAt) {
    return undefined;
  }
  const day = formatDay(lastFailedAt);
  return lastFailedBuildUrl
    ? `[${day}](${buildkiteJobUrl(lastFailedBuildUrl, lastFailedJobId)})`
    : day;
};

/**
 * Whether no report has found the suite flaky yet: a consistently failing issue, which the daily
 * report now finds flaky for the first time.
 */
const neverFlaky = (previous: RecordedFlakySuiteIssueMetadata | undefined): boolean =>
  previous !== undefined && previous['report.history'].length === 0;

/**
 * The flaky tests the issue has not shown, when it records the ones it has, or every flaky test
 * when it has never been flaky.
 */
const newlyFlakyTestIds = (
  suite: FlakySuite,
  previous: RecordedFlakySuiteIssueMetadata | undefined
): Set<string> => {
  const shown = previous?.['report.shownTestIds'] ?? (neverFlaky(previous) ? [] : undefined);
  return new Set(
    shown ? suite.tests.map(({ testId }) => testId).filter((id) => !shown.includes(id)) : []
  );
};

/** `still flaky`, or `now flaky` on an issue that has never been flaky, when it was closed too. */
const flakyState = (reopened: boolean, first: boolean): string => {
  if (first) {
    return reopened ? 'now flaky, after this issue was closed' : 'now flaky';
  }
  return reopened ? 'flaky again after this issue was closed' : 'still flaky';
};

/** `10% of builds (49 / 509)` */
const buildNumbers = ({ buildFailRate, failedBuilds, builds }: BuildCounts): string =>
  `${formatPercent(buildFailRate)} of builds (${failedBuilds} / ${builds})`;

const withLastFailed = (numbers: string, latest: BuildCounts | undefined): string => {
  const lastFailed = latest ? lastFailedLink(latest) : undefined;
  return lastFailed ? `${numbers}, last failed ${lastFailed}` : numbers;
};

type FlakySuiteTest = FlakySuite['tests'][number];

/**
 * The test's counts on those of the branches given where it is flaky itself, highest rate first,
 * as in the body's tests table: a stray failure on another branch is left out.
 */
const flakyOn = (
  test: FlakySuiteTest,
  branches: readonly JudgedScope[],
  thresholds: BranchThresholds
) => {
  const keys = new Set(branches.map(scopeKey));
  return test.byBranch
    .filter((stats) => keys.has(scopeKey(stats)) && isFlakyBranch(stats, thresholds))
    .sort((a, b) => b.buildFailRate - a.buildFailRate);
};

/**
 * `` - `sorts by status` (newly flaky): 10% of builds (49 / 509), last failed [9 Sep](…) ``: the
 * test's own numbers on the branches it is flaky on, each named when the comment covers several,
 * and its newest failure on them.
 */
const testLine = (
  test: FlakySuiteTest,
  flakyStats: ReturnType<typeof flakyOn>,
  nameBranches: boolean,
  newlyFlaky: boolean
): string => {
  const name = `${inlineCode(test.title)}${newlyFlaky ? ' (newly flaky)' : ''}`;
  const numbers = nameBranches
    ? flakyStats.map((stats) => `${buildNumbers(stats)} on ${formatScope(stats)}`).join(', ')
    : buildNumbers(flakyStats[0]);
  const latest = flakyStats.reduce<BuildCounts | undefined>(
    (newest, stats) =>
      stats.lastFailedAt && (!newest?.lastFailedAt || stats.lastFailedAt > newest.lastFailedAt)
        ? stats
        : newest,
    undefined
  );
  return `- ${name}: ${withLastFailed(numbers, latest)}`;
};

/**
 * What a comment covers: the branches where the suite is flaky and not skipped, worst first, a
 * pipeline judged on its own apart from the same branch of the others.
 */
const commentBranches = (suite: FlakySuite, thresholds: BranchThresholds): JudgedScope[] => {
  const flaky = flakyBranches(suite, thresholds);
  const skipped = branchSkips(suite);
  return worstPerKey(
    suite,
    (test) => test.byBranch,
    (stats) => scopeKey(stats)
  )
    .map(({ worst }): JudgedScope => ({ branch: worst.branch, pipeline: worst.pipeline }))
    .filter((scoped) => flaky.has(scopeKey(scoped)) && !skipped.has(scopeKey(scoped)));
};

/** The tests a comment lists, those flaky on one of its branches, with their counts there. */
const commentTests = (suite: FlakySuite, thresholds: BranchThresholds) => {
  const branches = commentBranches(suite, thresholds);
  return suite.tests
    .map((test) => ({ test, stats: flakyOn(test, branches, thresholds) }))
    .filter(({ stats }) => stats.length > 0);
};

/** The tests a comment names, as many as the body's tests table: what it records as shown. */
const commentedTestIds = (suite: FlakySuite, thresholds: BranchThresholds): string[] =>
  commentTests(suite, thresholds)
    .slice(0, MAX_TEST_ROWS)
    .map(({ test }) => test.testId);

/**
 * The comment of a refresh that found new failures: where the suite is flaky and not skipped, then
 * a line per test flaky there, as many as the body's tests table, with its own numbers and newest
 * failure, and the tests the issue has not shown marked as newly flaky. The body keeps the full
 * tables.
 */
export const renderFlakySuiteIssueComment = (
  suite: FlakySuite,
  { report, reopened, previous }: FlakySuiteIssueCommentContext
): string => {
  const first = neverFlaky(previous);
  const state = flakyState(reopened, first);
  const leadFor = (count: number) =>
    count > 1 ? `${plural(count, 'test')} ${state}` : `${state[0].toUpperCase()}${state.slice(1)}`;
  const branches = commentBranches(suite, report.thresholds);
  if (branches.length === 0) {
    return `${leadFor(suite.tests.length)}.`;
  }

  const where =
    branches.length === 1 ? `${reopened ? ',' : ''} on ${formatScope(branches[0])}` : '';
  const newlyFlaky = newlyFlakyTestIds(suite, previous);
  const listed = commentTests(suite, report.thresholds);
  const rest = listed.length - MAX_TEST_ROWS;
  return [
    `${leadFor(listed.length)}${where}:`,
    '',
    ...listed
      .slice(0, MAX_TEST_ROWS)
      .map(({ test, stats }) =>
        testLine(test, stats, branches.length > 1, !first && newlyFlaky.has(test.testId))
      ),
    ...(rest > 0 ? ['', `and ${plural(rest, 'more test')}.`] : []),
  ].join('\n');
};
