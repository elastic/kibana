/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { FlakyTestReport } from '@kbn/scout-reporting';
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  BUILDKITE_ORG_URL,
  codeBlock,
  formatBuildLink,
  formatDateRange,
  formatDateTime,
  formatFailureMessage,
  formatPercent,
  FRAMEWORK_LABELS,
  inlineCode,
  KIBANA_BLOB_URL,
  plural,
  shortTitle,
  table,
  testsTable,
} from './markdown';
import type { FlakySuite } from './suites';

/** Namespace of the hidden `kibanaCiData` block at the end of the issue body and comments. */
export const FLAKY_TEST_SUITE_METADATA_PREFIX = 'flaky-test-suite';

const MAX_TEST_ROWS = 15;
/** Distinct error messages shown in full; a suite with more gets a count of the rest. */
const MAX_DISTINCT_FAILURES = 4;
/** Test titles labelling an error are cut beyond this many characters. */
const MAX_LABEL_TITLE_LENGTH = 80;
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

/** `Flaky Scout suite: Lens ESQL dashboard inline editing`, or the file name without a suite title. */
export const flakySuiteIssueTitle = (
  suite: Pick<FlakySuite, 'filePath' | 'framework' | 'suiteTitle'>
): string => {
  const subject = suite.suiteTitle ?? Path.basename(suite.filePath);
  const lead = `Flaky ${FRAMEWORK_LABELS[suite.framework].short} suite: `;
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

/** `3 tests in the \`Default status alert\` suite appear to be flaky:` */
const opening = (suite: FlakySuite): string => {
  const subject = suite.suiteTitle ?? Path.basename(suite.filePath);
  const count = suite.tests.length;
  return (
    `${plural(count, 'test')} in the ${inlineCode(subject)} suite ` +
    `${count === 1 ? 'appears' : 'appear'} to be flaky:`
  );
};

const blobLink = (repoRelativePath: string): string =>
  `[${inlineCode(repoRelativePath)}](${KIBANA_BLOB_URL}/${repoRelativePath})`;

const suiteDetails = (suite: FlakySuite): string => {
  const framework = FRAMEWORK_LABELS[suite.framework].long;
  const rows: string[][] = [
    ['**File**', blobLink(suite.filePath)],
    ['**Framework**', framework],
    ...(suite.configPath ? [['**Config**', blobLink(suite.configPath)]] : []),
    ['**Owners**', suite.owners.length > 0 ? suite.owners.map(inlineCode).join(', ') : '-'],
  ];
  return table(['Field', 'Value'], rows);
};

interface DistinctFailure {
  message: string;
  count: number;
  /** Titles of the tests the message was sampled from, most samples first. */
  tests: string[];
}

/** Sampled failure messages grouped by identical text, most frequent first. */
const distinctFailures = (suite: FlakySuite): { distinct: DistinctFailure[]; total: number } => {
  const byMessage = new Map<string, { count: number; byTest: Map<string, number> }>();
  let total = 0;
  for (const test of suite.tests) {
    for (const { message } of test.sampleFailures) {
      const text = formatFailureMessage(message);
      if (text.length === 0) {
        continue;
      }
      total += 1;
      const entry = byMessage.get(text) ?? { count: 0, byTest: new Map<string, number>() };
      entry.count += 1;
      entry.byTest.set(test.title, (entry.byTest.get(test.title) ?? 0) + 1);
      byMessage.set(text, entry);
    }
  }
  const distinct = [...byMessage.entries()]
    .map(([message, { count, byTest }]) => ({
      message,
      count,
      tests: [...byTest.entries()].sort((a, b) => b[1] - a[1]).map(([title]) => title),
    }))
    .sort((a, b) => b.count - a.count);
  return { distinct, total };
};

const failuresSection = (suite: FlakySuite): string => {
  const { distinct, total } = distinctFailures(suite);
  if (distinct.length === 0) {
    return 'No failure messages were sampled for this suite.';
  }
  const samples = plural(total, 'sampled failure');
  if (distinct.length === 1) {
    const intro = total === 1 ? 'One sampled failure' : `Same error in all ${samples}`;
    return `${intro}:\n\n${codeBlock(distinct[0].message)}`;
  }
  const shown = distinct.slice(0, MAX_DISTINCT_FAILURES).map(({ message, count, tests }) => {
    const subject =
      suite.tests.length > 1
        ? tests.map((title) => `*${shortTitle(title, MAX_LABEL_TITLE_LENGTH)}*`).join(', ')
        : '';
    const share = count === total ? `all ${samples}` : `${count} of the ${samples}`;
    return `${subject ? `${subject} ` : ''}(${share}):\n\n${codeBlock(message)}`;
  });
  const rest = distinct.length - shown.length;
  return [
    ...shown,
    ...(rest > 0 ? [`and ${plural(rest, 'more error')} among the sampled failures.`] : []),
  ].join('\n\n');
};

/** A branch's row of the breakdown: the worst test's counts there and the newest failure. */
interface BranchFailures {
  branch: string;
  builds: number;
  failedBuilds: number;
  buildFailRate: number;
  lastFailedAt?: Date;
}

/**
 * Every branch in scope a test of the suite ran on, failing branches first then by rate. Counts
 * are the worst test's on that branch rather than a sum over tests, as one build failing several
 * tests would otherwise count several times.
 */
const branchFailures = (suite: FlakySuite): BranchFailures[] => {
  const byBranch = new Map<string, BranchFailures>();
  for (const test of suite.tests) {
    for (const stats of test.byBranch) {
      const current = byBranch.get(stats.branch);
      const worst =
        !current ||
        stats.failedBuilds > current.failedBuilds ||
        (stats.failedBuilds === current.failedBuilds && stats.builds > current.builds)
          ? stats
          : current;
      const lastFailedAt = [current?.lastFailedAt, stats.lastFailedAt]
        .filter((date): date is Date => date !== undefined)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      byBranch.set(stats.branch, {
        branch: stats.branch,
        builds: worst.builds,
        failedBuilds: worst.failedBuilds,
        buildFailRate: worst.buildFailRate,
        lastFailedAt,
      });
    }
  }
  return [...byBranch.values()].sort(
    (a, b) =>
      Number(b.failedBuilds > 0) - Number(a.failedBuilds > 0) ||
      b.buildFailRate - a.buildFailRate ||
      a.branch.localeCompare(b.branch)
  );
};

/** Which branches the suite fails on and which it does not, at a glance. */
const failuresByBranch = (suite: FlakySuite): string | undefined => {
  const branches = branchFailures(suite);
  if (branches.length === 0) {
    return undefined;
  }
  const rows = branches.map(({ branch, builds, failedBuilds, buildFailRate, lastFailedAt }) => [
    `${failedBuilds > 0 ? '🔴' : '✅'} ${inlineCode(branch)}`,
    failedBuilds > 0
      ? `${failedBuilds} / ${builds} (${formatPercent(buildFailRate)})`
      : `0 / ${builds}`,
    lastFailedAt ? formatDateTime(lastFailedAt) : '',
  ]);
  return [
    '#### Failures by Branch',
    '',
    table(['Branch', 'Failed builds', 'Last failure'], rows),
  ].join('\n');
};

const pipelineLink = (pipeline: string): string =>
  `[${inlineCode(pipeline)}](${BUILDKITE_ORG_URL}/${pipeline})`;

const pipelineFailedBuilds = ({
  builds,
  failedBuilds,
  buildFailRate,
}: FlakySuite['byPipeline'][number]): string =>
  `${failedBuilds} / ${builds} (${formatPercent(buildFailRate)})`;

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
    pipelineFailedBuilds(stats),
    String(stats.failedBranches),
    formatBuildLink(stats.lastFailedBuildUrl, stats.lastFailedAt),
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
    failuresSection(suite),
    failuresByBranch(suite),
    failuresByPipeline(suite, ctx.report),
    relatedIssues(ctx),
  ];
  return updateIssueMetadata(
    sections.filter((section) => section !== undefined).join('\n\n'),
    flakySuiteIssueMetadata(suite, ctx.report),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
};
