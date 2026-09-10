/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  formatRate,
  rankTests,
  type FlakyTestEntry,
  type FlakyTestReport,
  type TestFramework,
} from '@kbn/scout-reporting';
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import type { FlakySuite } from './suites';

/**
 * Words every issue title contains, e.g. `Flaky Scout test suite: <file>`. Together with the
 * `failed-test` label they are how the reporter finds its issues again, so they must stay stable.
 */
export const FLAKY_TEST_SUITE_TITLE_TERMS = ['Flaky', 'test suite'] as const;
/** Namespace of the hidden `kibanaCiData` block at the end of the issue body. */
export const FLAKY_TEST_SUITE_METADATA_PREFIX = 'flaky-test-suite';

const FLAKY_TEST_RUNNER_URL = 'https://buildkite.com/elastic/kibana-flaky';
const HOW_IT_WORKS_URL =
  'https://github.com/elastic/kibana/blob/main/packages/kbn-failed-test-reporter-cli/README.md#node-scriptsreport_flaky_tests';
const MAX_BRANCHES_IN_HEADLINE = 4;

const FRAMEWORK_LABELS: Record<TestFramework, string> = {
  playwright: 'Scout',
  ftr: 'FTR',
  jest: 'Jest',
  cypress: 'Cypress',
};

export interface FlakySuiteIssueContext {
  report: FlakyTestReport;
  /** Where the report can be downloaded, e.g. the Buildkite artifact. */
  reportUrl?: string;
}

export interface FlakySuiteIssueMetadata {
  'suite.filePath': string;
  'suite.framework': string;
  'suite.testIds': string[];
  'report.generatedAt': string;
}

/** `Flaky Scout test suite: <file>`; the framework tells readers which runner reproduces it. */
export const flakySuiteIssueTitle = (suite: Pick<FlakySuite, 'filePath' | 'framework'>): string => {
  const [flaky, testSuite] = FLAKY_TEST_SUITE_TITLE_TERMS;
  return `${flaky} ${FRAMEWORK_LABELS[suite.framework]} ${testSuite}: ${suite.filePath}`;
};

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

/**
 * Position of the suite's worst test among all flaky tests of the report, e.g. `#3 of 148`. The
 * report only keeps the worst `maxTests`, so a full list means there were at least that many.
 */
const rankLabel = (worst: FlakyTestEntry, report: FlakyTestReport): string | undefined => {
  const index = rankTests(report.flaky).findIndex((test) => test.testId === worst.testId);
  if (index === -1) {
    return undefined;
  }
  const { totalFlaky } = report.summary;
  const total = totalFlaky >= report.thresholds.maxTests ? `${totalFlaky}+` : String(totalFlaky);
  return `#${index + 1} of ${total}`;
};

/** Branches the suite failed on, most failed builds first, e.g. `` `main`, `9.1` and 2 more``. */
const failingBranches = (tests: readonly FlakyTestEntry[]): string => {
  const failedBuildsByBranch = new Map<string, number>();
  for (const { byBranch } of tests) {
    for (const { branch, failedBuilds } of byBranch) {
      if (failedBuilds > 0) {
        failedBuildsByBranch.set(branch, (failedBuildsByBranch.get(branch) ?? 0) + failedBuilds);
      }
    }
  }
  const branches = [...failedBuildsByBranch.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([branch]) => inlineCode(branch));
  const shown = branches.slice(0, MAX_BRANCHES_IN_HEADLINE).join(', ');
  const rest = branches.length - MAX_BRANCHES_IN_HEADLINE;
  return rest > 0 ? `${shown} and ${rest} more` : shown;
};

/**
 * One line that says how bad it is: rank among all flaky tests, failed builds, last failure and
 * affected branches. Everything a reader needs to decide whether to look further.
 */
const headline = (suite: FlakySuite, report: FlakyTestReport): string => {
  const [worst] = suite.tests;
  const pipelines = report.scope.pipelines.map(inlineCode).join(', ');
  const window = `on ${pipelines} in the last ${plural(report.window.lookbackDays, 'day')}`;
  const rank = rankLabel(worst, report);
  const position = rank ? `**${rank}** flaky tests ${window}` : `Flaky ${window}`;
  const subject =
    suite.tests.length === 1
      ? position
      : `**${suite.tests.length} flaky tests** in this file; the worst is ${position}`;
  const failures =
    `${suite.tests.length === 1 ? 'Failed' : 'It failed'} **${worst.failedBuilds} of ` +
    `${worst.builds} builds (${formatRate(worst.buildFailRate)})**, last on ` +
    `${formatDateTime(worst.lastFailedAt)}.`;
  const branches = failingBranches(suite.tests);
  return `> ${subject}. ${failures}${branches ? ` Fails on ${branches}.` : ''}`;
};

const suiteDetails = (suite: FlakySuite): string => {
  const rows: string[][] = [
    ['File', inlineCode(suite.filePath)],
    ...(suite.tests.length === 1 ? [['Test', suite.tests[0].title]] : []),
    ['Framework', suite.framework],
    ...(suite.configPath ? [['Config', inlineCode(suite.configPath)]] : []),
    ['Code owners', suite.owners.length > 0 ? suite.owners.join(', ') : '-'],
  ];
  return table(['Field', 'Value'], rows);
};

/** Per-test breakdown; a single test is already fully described by the headline and details. */
const testsTable = (suite: FlakySuite): string | undefined => {
  if (suite.tests.length === 1) {
    return undefined;
  }
  const rows = suite.tests.map((test) => [
    test.title,
    `${test.failedBuilds}/${test.builds}`,
    formatRate(test.buildFailRate),
  ]);
  return `**Flaky tests** (ranked by failed builds)\n\n${table(
    ['Test', 'Failed builds', 'Fail rate'],
    rows
  )}`;
};

const footer = ({ report, reportUrl }: FlakySuiteIssueContext): string => {
  const generatedAt = `generated ${formatDateTime(report.generatedAt)}`;
  const source = reportUrl
    ? `Source: [flaky_tests.json](${reportUrl}), ${generatedAt}`
    : `Source: flaky test report ${generatedAt}`;
  return [
    `Reproduce with the [flaky test runner](${FLAKY_TEST_RUNNER_URL})`,
    source,
    `[How this issue is generated](${HOW_IT_WORKS_URL})`,
  ].join(' · ');
};

export const flakySuiteIssueMetadata = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext
): FlakySuiteIssueMetadata => ({
  'suite.filePath': suite.filePath,
  'suite.framework': suite.framework,
  'suite.testIds': suite.tests.map((test) => test.testId),
  'report.generatedAt': ctx.report.generatedAt.toISOString(),
});

/** Full issue body for a suite, including the metadata footer. */
export const renderFlakySuiteIssueBody = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext
): string => {
  const sections = [
    headline(suite, ctx.report),
    suiteDetails(suite),
    testsTable(suite),
    footer(ctx),
  ];
  return updateIssueMetadata(
    sections.filter((section) => section !== undefined).join('\n\n'),
    flakySuiteIssueMetadata(suite, ctx),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
};
