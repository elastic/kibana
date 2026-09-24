/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { FlakyTestReport, TestFramework } from '@kbn/scout-reporting';
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  BUILDKITE_ORG_URL,
  CATEGORY_LABELS,
  codeBlock,
  collapsed,
  formatBuildLink,
  formatFailedBranches,
  formatDateRange,
  formatFailedBuilds,
  formatFullFailureMessage,
  formatPercent,
  FRAMEWORK_LABELS,
  inlineCode,
  isPullRequestRef,
  KIBANA_BLOB_URL,
  plural,
  table,
  targetEnvironment,
  testsTable,
} from './markdown';
import type { FlakySuite } from './suites';

/** Namespace of the hidden `kibanaCiData` block at the end of the issue body and comments. */
export const FLAKY_TEST_SUITE_METADATA_PREFIX = 'flaky-test-suite';

const MAX_TEST_ROWS = 15;
/** Distinct errors shown; a suite with more gets a count of the rest. */
const MAX_ERRORS = 4;
/** GitHub rejects longer issue titles with a 422. */
const MAX_TITLE_LENGTH = 256;

export interface FlakySuiteIssueContext {
  report: FlakyTestReport;
  /** Numbers of issues that mention the suite's file without being about it. */
  relatedIssues?: number[];
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
  /** Newest report that found the suite flaky. */
  'report.generatedAt': string;
  /** Reports that found the suite flaky, including the one that filed the issue. */
  'report.count': number;
  /** One snapshot per report that found the suite flaky, oldest first. */
  'report.history': FlakySuiteReportSnapshot[];
}

const metadataValue = (body: string, key: keyof FlakySuiteIssueMetadata): unknown =>
  getIssueMetadata(body, key, undefined, FLAKY_TEST_SUITE_METADATA_PREFIX);

const isSnapshot = (value: unknown): value is FlakySuiteReportSnapshot =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FlakySuiteReportSnapshot).generatedAt === 'string' &&
  typeof (value as FlakySuiteReportSnapshot).builds === 'number' &&
  typeof (value as FlakySuiteReportSnapshot).failedBuilds === 'number';

/** Suite metadata recorded in an issue body, if the body was written by this reporter. */
export const readFlakySuiteIssueMetadata = (
  body: string
):
  | (Pick<FlakySuiteIssueMetadata, 'suite.filePath' | 'report.history'> &
      Partial<FlakySuiteIssueMetadata>)
  | undefined => {
  const filePath = metadataValue(body, 'suite.filePath');
  if (typeof filePath !== 'string') {
    return undefined;
  }
  const title = metadataValue(body, 'suite.title');
  const framework = metadataValue(body, 'suite.framework');
  const testIds = metadataValue(body, 'suite.testIds');
  const generatedAt = metadataValue(body, 'report.generatedAt');
  const count = metadataValue(body, 'report.count');
  const history = metadataValue(body, 'report.history');
  return {
    'suite.filePath': filePath,
    'suite.title': typeof title === 'string' ? title : undefined,
    'suite.framework': typeof framework === 'string' ? framework : undefined,
    'suite.testIds': Array.isArray(testIds)
      ? testIds.filter((id): id is string => typeof id === 'string')
      : undefined,
    'report.generatedAt': typeof generatedAt === 'string' ? generatedAt : undefined,
    'report.count': typeof count === 'number' ? count : undefined,
    'report.history': Array.isArray(history) ? history.filter(isSnapshot) : [],
  };
};

const snapshot = (suite: FlakySuite, report: FlakyTestReport): FlakySuiteReportSnapshot => ({
  generatedAt: report.generatedAt.toISOString(),
  builds: suite.tests[0].builds,
  failedBuilds: suite.tests[0].failedBuilds,
});

/** Metadata of a freshly filed issue. */
export const flakySuiteIssueMetadata = (
  suite: FlakySuite,
  report: FlakyTestReport
): FlakySuiteIssueMetadata => ({
  'suite.filePath': suite.filePath,
  ...(suite.suiteTitle ? { 'suite.title': suite.suiteTitle } : {}),
  'suite.framework': suite.framework,
  'suite.testIds': suite.tests.map((test) => test.testId),
  'report.generatedAt': report.generatedAt.toISOString(),
  'report.count': 1,
  'report.history': [snapshot(suite, report)],
});

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
 * `Flaky Scout API suite: Lens ESQL dashboard inline editing`, or the file name without a suite
 * title. Display only; issues are matched on their metadata, never on the title.
 */
export const flakySuiteIssueTitle = (
  suite: Pick<FlakySuite, 'filePath' | 'framework' | 'suiteTitle' | 'configCategory'>
): string => {
  const subject = suite.suiteTitle ?? Path.basename(suite.filePath);
  const category = titleCategory(suite.framework, suite.configCategory);
  const lead = `Flaky ${FRAMEWORK_LABELS[suite.framework].short}${
    category ? ` ${category}` : ''
  } suite: `;
  // Nested describe blocks can join into a subject longer than GitHub accepts for a title
  const room = MAX_TITLE_LENGTH - lead.length;
  return lead + (subject.length > room ? `${subject.slice(0, room - 1)}…` : subject);
};

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

/**
 * `🔴 \`main\` | 49 / 509 (10%) | [#12345](…#job) · 2026-09-09 06:12 UTC`, or `✅ \`9.1\` | 0 / 58 |`
 * for a clean row. Reports written before the build was recorded get the time alone.
 */
const failuresRow = (label: string, { worst, latest }: WorstFailures<BuildCounts>): string[] => [
  `${worst.failedBuilds > 0 ? '🔴' : '✅'} ${label}`,
  worst.failedBuilds > 0 ? formatFailedBuilds(worst) : `0 / ${worst.builds}`,
  latest
    ? formatBuildLink(
        { buildUrl: latest.lastFailedBuildUrl, jobId: latest.lastFailedJobId },
        latest.lastFailedAt
      )
    : '',
];

/** Which branches the suite fails on and which it does not, at a glance. */
const failuresByBranch = (suite: FlakySuite): string | undefined => {
  const branches = worstPerKey(
    suite,
    (test) => test.byBranch,
    (stats) => stats.branch
  );
  if (branches.length === 0) {
    return undefined;
  }
  const rows = branches.map((row) => failuresRow(inlineCode(row.worst.branch), row));
  return [
    '#### Failures by Branch',
    '',
    table(['Branch', 'Failed builds', 'Sample failure'], rows),
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
    (stats) => `${stats.mode} · ${stats.type}`
  );
  if (targets.length === 0) {
    return undefined;
  }
  const rows = targets.map((row) => {
    const [target, ...rest] = failuresRow(inlineCode(row.worst.mode), row);
    return [target, targetEnvironment(row.worst), ...rest];
  });
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
  failures: number;
  /** Only known when a single test hit the error; a build failing two tests would count twice. */
  builds?: number;
  byPipeline: Map<string, number>;
  branches: Set<string>;
  targets: Set<string>;
  /** Titles of the tests that hit the error, in ranking order. */
  tests: string[];
  firstFailedAt: Date;
  lastFailedAt: Date;
  lastFailedBuildUrl?: string;
  lastFailedJobId?: string;
}

/** The errors of every test in the suite, merged on the report's key, most failures first. */
const suiteErrors = (suite: FlakySuite): SuiteError[] => {
  const byKey = new Map<string, SuiteError>();
  for (const test of suite.tests) {
    for (const error of test.errors) {
      const current = byKey.get(error.key);
      if (!current) {
        byKey.set(error.key, {
          key: error.key,
          message: error.message,
          failures: error.failures,
          builds: error.builds,
          byPipeline: new Map(
            error.byPipeline.map(({ pipeline, failures }) => [pipeline, failures])
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
      current.failures += error.failures;
      current.builds = undefined;
      for (const { pipeline, failures } of error.byPipeline) {
        current.byPipeline.set(pipeline, (current.byPipeline.get(pipeline) ?? 0) + failures);
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
  return [...byKey.values()].sort((a, b) => b.failures - a.failures || a.key.localeCompare(b.key));
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
const formatErrorPipelines = (byPipeline: Map<string, number>): string => {
  const entries = [...byPipeline.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (entries.length === 1) {
    return `${inlineCode(entries[0][0])} only`;
  }
  return entries.map(([pipeline, failures]) => `${inlineCode(pipeline)} (${failures})`).join(', ');
};

/**
 * One error, collapsed under its share of the suite's failures and its first line; inside, the
 * full message, then where it was seen.
 */
const errorSection = (suite: FlakySuite, error: SuiteError, totalFailures: number): string => {
  const counts =
    error.builds !== undefined
      ? `${error.failures} in ${plural(error.builds, 'build')}`
      : `${error.failures} across ${plural(error.tests.length, 'test')}`;
  const summary =
    `<b>${formatPercent(error.failures / totalFailures)} of failures</b> (${counts}) · ` +
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
    )
  );
};

/** An error seen on nothing but pull request builds is that pull request's, not the suite's. */
const isPullRequestOnly = (error: SuiteError): boolean =>
  [...error.branches].every(isPullRequestRef);

/**
 * The suite's distinct errors over the window, most failures first, at most `MAX_ERRORS` shown.
 * Errors seen only on pull request builds are left out, and the section says so, so that it
 * describes what the suite does on real branches.
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
  const totalFailures = errors.reduce((sum, error) => sum + error.failures, 0);
  const shown = errors
    .slice(0, MAX_ERRORS)
    .map((error) => errorSection(suite, error, totalFailures));
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

const relatedIssues = (ctx: FlakySuiteIssueContext): string | undefined =>
  ctx.relatedIssues && ctx.relatedIssues.length > 0
    ? `Possibly related: ${ctx.relatedIssues.map((number) => `#${number}`).join(', ')}.`
    : undefined;

/** Full issue body for a suite, including the hidden metadata. */
export const renderFlakySuiteIssueBody = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext
): string => {
  const sections = [
    opening(suite),
    testsTable(suite.tests, {
      withDashboardLinks: true,
      maxRows: MAX_TEST_ROWS,
      thresholds: ctx.report.thresholds,
    }),
    skippedNote(suite),
    '### Suite',
    suiteDetails(suite),
    '### Failures',
    failuresByErrorMessage(suite),
    failuresByBranch(suite),
    failuresByTarget(suite),
    failuresByPipeline(suite, ctx.report),
    relatedIssues(ctx),
  ];
  return updateIssueMetadata(
    sections.filter((section) => section !== undefined).join('\n\n'),
    flakySuiteIssueMetadata(suite, ctx.report),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
};
