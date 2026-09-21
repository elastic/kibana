/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { rankTests, type FlakyTestEntry, type FlakyTestReport } from '@kbn/scout-reporting';
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  BUILDKITE_ORG_URL,
  FRAMEWORK_LABELS,
  KIBANA_BLOB_URL,
  branchesByFailedBuilds,
  codeBlock,
  formatBuildLink,
  formatDateRange,
  formatFailureMessage,
  formatPercent,
  formatWindow,
  inlineCode,
  plural,
  shortTitle,
  table,
  testsTable,
} from './markdown';
import type { FlakySuite } from './suites';

/**
 * Words every suite issue title contains, e.g. `[Lens] Flaky Scout test suite: <suite>`. Older
 * issues named the file instead of the suite; `readSuiteFilePathFromTitle` still reads those.
 */
export const FLAKY_TEST_SUITE_TITLE_TERMS = ['Flaky', 'test suite'] as const;
/** Namespace of the hidden `kibanaCiData` block at the end of the issue body and comments. */
export const FLAKY_TEST_SUITE_METADATA_PREFIX = 'flaky-test-suite';

/** Pipelines whose fail rate readers care about most; it is shown in bold. */
const HIGHLIGHTED_PIPELINES = new Set(['kibana-on-merge', 'kibana-pull-request']);
const RANK_TIERS = [5, 10, 20, 30, 50, 100];
const MAX_TEST_ROWS = 15;
const MAX_DISTINCT_FAILURES = 2;
/** A branch is named in the headline when it fails at least this share of the flakiest one. */
const HEADLINE_BRANCH_SHARE = 0.25;
const MAX_HEADLINE_BRANCHES = 2;

export interface FlakySuiteIssueContext {
  report: FlakyTestReport;
  /** `[<Module>]` title prefix, e.g. `Lens`; omitted when undefined. */
  moduleLabel?: string;
  /** Dashboard with the live numbers, linked from the headline when given. */
  dashboardUrl?: string;
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

/** `Flaky <anything> test suite: <file>`, the title format of issues filed before the suite title. */
const LEGACY_TITLE_PATTERN = new RegExp(
  `^${FLAKY_TEST_SUITE_TITLE_TERMS[0]}\\b.*\\b${FLAKY_TEST_SUITE_TITLE_TERMS[1]}:\\s*(\\S+\\.[jt]sx?)\\s*$`
);

/** Suite file path named by a legacy issue title. */
export const readSuiteFilePathFromTitle = (title: string): string | undefined =>
  title.trim().match(LEGACY_TITLE_PATTERN)?.[1];

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

/** `[Lens] Flaky Scout test suite: Lens ESQL dashboard inline editing` */
export const flakySuiteIssueTitle = (
  suite: Pick<FlakySuite, 'filePath' | 'framework' | 'suiteTitle'>,
  moduleLabel?: string
): string => {
  const [flaky, testSuite] = FLAKY_TEST_SUITE_TITLE_TERMS;
  const subject = suite.suiteTitle ?? Path.basename(suite.filePath);
  const prefix = moduleLabel ? `[${moduleLabel}] ` : '';
  return `${prefix}${flaky} ${FRAMEWORK_LABELS[suite.framework].short} ${testSuite}: ${subject}`;
};

/** `in the top 30 flakiest tests`: the tier the suite's worst test falls in, over the whole report. */
export const rankTierLabel = (worst: FlakyTestEntry, report: FlakyTestReport): string => {
  const index = rankTests(report.flaky).findIndex((test) => test.testId === worst.testId);
  const rank = index === -1 ? Number.POSITIVE_INFINITY : index + 1;
  const tier = RANK_TIERS.find((size) => rank <= size);
  if (tier) {
    return `in the top ${tier} flakiest tests`;
  }
  const { totalFlaky } = report.summary;
  const total = totalFlaky >= report.thresholds.maxTests ? `${totalFlaky}+` : String(totalFlaky);
  return `among the ${total} flakiest tests`;
};

/** `` `main` `` or `` `main` and `9.2` ``: the branches that fail materially. */
const headlineBranches = (suite: FlakySuite): string | undefined => {
  // Only the branches the report's thresholds were met on; every branch for reports without them
  const qualifying = new Set(
    suite.tests.flatMap((test) => (test.flakiestBranch ? [test.flakiestBranch.branch] : []))
  );
  const ranked = branchesByFailedBuilds(suite.tests).filter(
    (stats) => stats.failedBuilds > 0 && (qualifying.size === 0 || qualifying.has(stats.branch))
  );
  if (ranked.length === 0) {
    return undefined;
  }
  const threshold = ranked[0].failedBuilds * HEADLINE_BRANCH_SHARE;
  return ranked
    .filter((stats) => stats.failedBuilds >= threshold)
    .slice(0, MAX_HEADLINE_BRANCHES)
    .map((stats) => inlineCode(stats.branch))
    .join(' and ');
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

const headline = (suite: FlakySuite, ctx: FlakySuiteIssueContext): string => {
  const { report, dashboardUrl } = ctx;
  const branches = headlineBranches(suite);
  const where = branches ? ` on ${branches}` : '';
  const dashboard = dashboardUrl ? ` — [dashboard with latest stats](${dashboardUrl})` : '';
  return [
    `A **flaky** test suite fails frequently${where}: ${rankTierLabel(suite.tests[0], report)} ` +
      `${formatWindow(report)}${dashboard}.`,
    skippedNote(suite),
  ]
    .filter((part) => part !== undefined)
    .join(' ');
};

const blobLink = (repoRelativePath: string): string =>
  `[${inlineCode(repoRelativePath)}](${KIBANA_BLOB_URL}/${repoRelativePath})`;

const suiteDetails = (suite: FlakySuite): string => {
  const framework = FRAMEWORK_LABELS[suite.framework].long;
  const rows: string[][] = [
    ['**File**', blobLink(suite.filePath)],
    [
      '**Framework**',
      suite.configPath ? `${framework} · ${blobLink(suite.configPath)}` : framework,
    ],
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
      suite.tests.length > 1 ? tests.map((title) => `*${shortTitle(title)}*`).join(', ') : '';
    const share = count === total ? `all ${samples}` : `${count} of the ${samples}`;
    return `${subject ? `${subject} ` : ''}(${share}):\n\n${codeBlock(message)}`;
  });
  return [`${plural(distinct.length, 'distinct error')}.`, ...shown].join('\n\n');
};

const pipelineLink = (pipeline: string): string =>
  `[${inlineCode(pipeline)}](${BUILDKITE_ORG_URL}/${pipeline})`;

const pipelineFailedBuilds = ({
  pipeline,
  builds,
  failedBuilds,
  buildFailRate,
}: FlakySuite['byPipeline'][number]): string => {
  const percent = formatPercent(buildFailRate);
  const rate = HIGHLIGHTED_PIPELINES.has(pipeline) ? `**${percent}**` : percent;
  return `${failedBuilds} / ${builds} (${rate})`;
};

/** Collapsed per-pipeline breakdown over every pipeline and branch, not just the report scope. */
const failuresByPipeline = (suite: FlakySuite, report: FlakyTestReport): string | undefined => {
  if (suite.byPipeline.length === 0) {
    return undefined;
  }
  const scope = `${formatDateRange(report.window.from, report.window.to)}, all branches${
    suite.tests.length > 1 ? ', any of the tests above' : ''
  }:`;
  const rows = suite.byPipeline.map((stats) => [
    pipelineLink(stats.pipeline),
    pipelineFailedBuilds(stats),
    String(stats.failedBranches),
    formatBuildLink(stats.lastFailedBuildUrl, stats.lastFailedAt),
  ]);
  return [
    '<details>',
    '<summary><b>Failures by pipeline</b></summary>',
    '',
    scope,
    '',
    table(['Pipeline', 'Failed builds', 'Branches', 'Sample failure'], rows),
    '',
    '</details>',
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
    headline(suite, ctx),
    `### ${FRAMEWORK_LABELS[suite.framework].short} suite`,
    '#### Flaky tests',
    testsTable(suite.tests, { withTestId: true, maxRows: MAX_TEST_ROWS }),
    '#### Suite details',
    suiteDetails(suite),
    '### Failures',
    failuresSection(suite),
    failuresByPipeline(suite, ctx.report),
    relatedIssues(ctx),
  ];
  return updateIssueMetadata(
    sections.filter((section) => section !== undefined).join('\n\n'),
    flakySuiteIssueMetadata(suite, ctx.report),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
};
