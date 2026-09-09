/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  flakiestBranch,
  formatAge,
  formatRate,
  type FlakyTestEntry,
  type FlakyTestReport,
  type FlakyTestSampleFailure,
} from '@kbn/scout-reporting';
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  redactSensitiveGithubFailureText,
  truncateFailureBody,
} from '../failed_tests_reporter/report_failure';
import type { FlakySuite } from './suites';

/** Label every issue filed by the flaky test reporter carries; also how it finds them again. */
export const FLAKY_TEST_SUITE_LABEL = 'flaky-test-suite';
/** Namespace of the hidden `kibanaCiData` block at the end of the issue body. */
export const FLAKY_TEST_SUITE_METADATA_PREFIX = 'flaky-test-suite';

const FLAKY_TEST_RUNNER_URL = 'https://buildkite.com/elastic/kibana-flaky';
// Failure samples only for the worst tests, so a suite with many flaky tests stays readable
const MAX_TESTS_WITH_SAMPLES = 5;
const MAX_SAMPLE_CHARACTERS = 1500;
// GitHub rejects bodies over 65536 characters; leave headroom for the metadata footer
const MAX_BODY_CHARACTERS = 60_000;

export interface RelatedIssue {
  number: number;
  html_url: string;
  title: string;
}

export interface FlakySuiteIssueContext {
  report: FlakyTestReport;
  /** Where the report can be downloaded, e.g. the Buildkite artifact. */
  reportUrl?: string;
  /** Open `failed-test` issues that track tests of this suite. */
  relatedIssues: RelatedIssue[];
  /** How many reports have flagged the suite so far, including this one. */
  reportCount: number;
}

export interface FlakySuiteIssueMetadata {
  'suite.filePath': string;
  'suite.framework': string;
  'suite.testIds': string[];
  'report.generatedAt': string;
  'report.count': number;
}

export const flakySuiteIssueTitle = (suite: Pick<FlakySuite, 'filePath'>): string =>
  `Flaky test suite: ${suite.filePath}`;

/** Suite file path recorded in an issue body, if the body was written by this reporter. */
export const readSuiteFilePath = (body: string): string | undefined => {
  const filePath: unknown = getIssueMetadata(
    body,
    'suite.filePath',
    undefined,
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
  return typeof filePath === 'string' ? filePath : undefined;
};

export const readReportCount = (body: string): number => {
  const count: unknown = getIssueMetadata(body, 'report.count', 0, FLAKY_TEST_SUITE_METADATA_PREFIX);
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);
const formatDateTime = (date: Date): string =>
  `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** Markdown table cells cannot contain pipes or line breaks. */
const cell = (value: string): string => value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
const inlineCode = (value: string): string => `\`${value.replace(/`/g, '')}\``;

const tableRow = (cells: string[]): string => `| ${cells.map(cell).join(' | ')} |`;
const table = (header: string[], rows: string[][]): string =>
  [tableRow(header), `|${header.map(() => '---').join('|')}|`, ...rows.map(tableRow)].join('\n');

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const BUILDKITE_BUILD_URL = /buildkite\.com\/[^/]+\/([^/]+)\/builds\/(\d+)/;

/** `kibana-on-merge #12345` when the URL is a Buildkite build, otherwise a generic label. */
const buildLabel = (buildUrl: string | undefined): string => {
  const match = buildUrl?.match(BUILDKITE_BUILD_URL);
  return match ? `${match[1]} #${match[2]}` : 'build';
};

const summaryLine = (suite: FlakySuite, report: FlakyTestReport): string => {
  const [worst] = suite.tests;
  const pipelines = report.scope.pipelines.map(inlineCode).join(', ');
  const window = `over the last ${plural(report.window.lookbackDays, 'day')} (${formatDate(
    report.window.from
  )} to ${formatDate(report.window.to)})`;
  const subject =
    suite.tests.length === 1
      ? 'A test in this suite was flaky'
      : `${suite.tests.length} tests in this suite were flaky`;
  const impact =
    suite.tests.length === 1
      ? `It failed in **${worst.failedBuilds} of ${worst.builds} builds** (${formatRate(
          worst.buildFailRate
        )}) and passed in the others.`
      : `The worst offender failed in **${worst.failedBuilds} of ${worst.builds} builds** (${formatRate(
          worst.buildFailRate
        )}) and passed in the others.`;
  return `${subject} on ${pipelines} ${window}. ${impact}`;
};

const suiteDetails = (suite: FlakySuite, ctx: FlakySuiteIssueContext): string => {
  const { report, reportUrl, reportCount } = ctx;
  const generatedAt = `generated ${formatDateTime(report.generatedAt)}`;
  const rows: string[][] = [
    ['File', inlineCode(suite.filePath)],
    ['Framework', suite.framework],
    ...(suite.configPath ? [['Config path', inlineCode(suite.configPath)]] : []),
    ['Code owners', suite.owners.length > 0 ? suite.owners.join(', ') : '-'],
    ['Pipelines', report.scope.pipelines.join(', ')],
    ['Branches', report.scope.branches.length > 0 ? report.scope.branches.join(', ') : 'all'],
    ['Report', reportUrl ? `[flaky_tests.json](${reportUrl}) (${generatedAt})` : generatedAt],
    ['Reports flagging this suite', String(reportCount)],
  ];
  return `**Suite details**\n\n${table(['Field', 'Value'], rows)}`;
};

const latestRunCell = (test: FlakyTestEntry, now: Date, minBuilds: number): string => {
  const latestRun = flakiestBranch(test.byBranch, minBuilds)?.latestRun ?? test.latestRun;
  return latestRun ? `${latestRun.status}, ${formatAge(latestRun.timestamp, now)}` : '-';
};

const impactTable = (suite: FlakySuite, report: FlakyTestReport): string => {
  const { minBuilds } = report.thresholds;
  const rows = suite.tests.map((test) => {
    const flakiest = flakiestBranch(test.byBranch, minBuilds);
    return [
      test.title,
      `${test.failedBuilds}/${test.builds}`,
      formatRate(test.buildFailRate),
      String(test.retryFlakes),
      flakiest ? `${flakiest.branch} (${formatRate(flakiest.buildFailRate)})` : '-',
      latestRunCell(test, report.generatedAt, minBuilds),
    ];
  });
  return `**Impact per test** (ranked by failed builds)\n\n${table(
    ['Test', 'Failed builds', 'Fail rate', 'Retry flakes', 'Flakiest branch', 'Latest run'],
    rows
  )}`;
};

const sampleFailure = ({ message, buildUrl, timestamp }: FlakyTestSampleFailure): string => {
  const label = buildLabel(buildUrl);
  const heading = `${buildUrl ? `[${label}](${buildUrl})` : label} · ${formatDateTime(timestamp)}`;
  const text = redactSensitiveGithubFailureText(
    truncateFailureBody(message.trim(), MAX_SAMPLE_CHARACTERS)
  );
  // Four backticks so a message that itself contains a fenced block cannot break out
  return `${heading}\n\n\`\`\`\`\n${text}\n\`\`\`\``;
};

const recentFailures = (tests: readonly FlakyTestEntry[]): string[] =>
  tests
    .filter((test) => test.sampleFailures.length > 0)
    .map((test) =>
      [
        '<details>',
        `<summary>Recent failures: ${test.title}</summary>`,
        '',
        test.sampleFailures.map(sampleFailure).join('\n\n'),
        '',
        '</details>',
      ].join('\n')
    );

const relatedIssuesSection = (relatedIssues: readonly RelatedIssue[]): string | undefined => {
  if (relatedIssues.length === 0) {
    return undefined;
  }
  const items = relatedIssues.map((issue) => `- [#${issue.number}](${issue.html_url}) ${issue.title}`);
  return `**Related \`failed-test\` issues**\n\n${items.join('\n')}`;
};

const definitions = (report: FlakyTestReport): string => {
  const { minBuilds, minFailedBuilds } = report.thresholds;
  return (
    '**Definitions**\n\n' +
    `Flaky: ran in at least ${plural(minBuilds, 'build')} of the window, failed in at least ` +
    `${plural(minFailedBuilds, 'build')}, and passed at least once (or recovered on an in-run retry). ` +
    'Tests that never passed in the window are consistently failing rather than flaky and are ' +
    'not reported here.'
  );
};

const nextSteps = (report: FlakyTestReport): string => {
  const command =
    `node scripts/scout discover-flaky-tests --pipelines ${report.scope.pipelines.join(',')}` +
    ` --lookbackDays ${report.window.lookbackDays} --classifications flaky`;
  return [
    '**Next steps**',
    '',
    `- Reproduce with the flaky test runner: ${FLAKY_TEST_RUNNER_URL}`,
    `- Regenerate this report locally: \`${command}\``,
  ].join('\n');
};

export const flakySuiteIssueMetadata = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext
): FlakySuiteIssueMetadata => ({
  'suite.filePath': suite.filePath,
  'suite.framework': suite.framework,
  'suite.testIds': suite.tests.map((test) => test.testId),
  'report.generatedAt': ctx.report.generatedAt.toISOString(),
  'report.count': ctx.reportCount,
});

const renderBody = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext,
  testsWithSamples: number
): string => {
  const sections = [
    summaryLine(suite, ctx.report),
    suiteDetails(suite, ctx),
    impactTable(suite, ctx.report),
    ...recentFailures(suite.tests.slice(0, testsWithSamples)),
    relatedIssuesSection(ctx.relatedIssues),
    definitions(ctx.report),
    nextSteps(ctx.report),
  ];
  return updateIssueMetadata(
    sections.filter((section) => section !== undefined).join('\n\n'),
    flakySuiteIssueMetadata(suite, ctx),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
};

/**
 * Full issue body for a suite, including the metadata footer. Failure samples are dropped when
 * they would push the body over GitHub's size limit.
 */
export const renderFlakySuiteIssueBody = (suite: FlakySuite, ctx: FlakySuiteIssueContext): string => {
  const body = renderBody(suite, ctx, MAX_TESTS_WITH_SAMPLES);
  return body.length <= MAX_BODY_CHARACTERS ? body : renderBody(suite, ctx, 0);
};

/** Comment left when a closed issue is reopened because its suite is flaky again. */
export const renderReopenComment = (suite: FlakySuite, report: FlakyTestReport): string => {
  const [worst] = suite.tests;
  return (
    `Flaky again: ${plural(suite.tests.length, 'test')} in this suite failed in the last ` +
    `${plural(report.window.lookbackDays, 'day')}, the worst in ${worst.failedBuilds} of ` +
    `${worst.builds} builds (${formatRate(worst.buildFailRate)}). The issue body has been ` +
    'updated with the latest numbers.'
  );
};
