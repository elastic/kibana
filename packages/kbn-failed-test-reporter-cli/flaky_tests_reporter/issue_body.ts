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
  formatRate,
  rankTests,
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

/**
 * Title prefix of every issue filed by the flaky test reporter. Together with the `failed-test`
 * label it is how the reporter finds its issues again, so it must stay stable.
 */
export const FLAKY_TEST_SUITE_TITLE_PREFIX = 'Flaky test suite:';
/** Namespace of the hidden `kibanaCiData` block at the end of the issue body. */
export const FLAKY_TEST_SUITE_METADATA_PREFIX = 'flaky-test-suite';

const FLAKY_TEST_RUNNER_URL = 'https://buildkite.com/elastic/kibana-flaky';
const HOW_IT_WORKS_URL =
  'https://github.com/elastic/kibana/blob/main/packages/kbn-failed-test-reporter-cli/README.md#node-scriptsreport_flaky_tests';
// Failure samples only for the worst tests, so a suite with many flaky tests stays readable
const MAX_TESTS_WITH_SAMPLES = 5;
const MAX_SAMPLE_CHARACTERS = 1500;
// GitHub rejects bodies over 65536 characters; leave headroom for the metadata footer
const MAX_BODY_CHARACTERS = 60_000;
/** Reports remembered in the metadata footer to show how the suite is trending. */
export const MAX_HISTORY_ENTRIES = 10;
const MAX_BRANCHES_IN_HEADLINE = 4;

export interface RelatedIssue {
  number: number;
  html_url: string;
  title: string;
}

/** The worst test's numbers from one report, kept in the metadata footer. */
export interface FlakySuiteReportSnapshot {
  generatedAt: string;
  builds: number;
  failedBuilds: number;
}

export interface FlakySuiteIssueContext {
  report: FlakyTestReport;
  /** Where the report can be downloaded, e.g. the Buildkite artifact. */
  reportUrl?: string;
  /** Open `failed-test` issues that track tests of this suite. */
  relatedIssues: RelatedIssue[];
  /** How many reports have flagged the suite so far, including this one. */
  reportCount: number;
  /** Snapshots recorded by earlier reports, oldest first; this report's is appended. */
  history: FlakySuiteReportSnapshot[];
}

export interface FlakySuiteIssueMetadata {
  'suite.filePath': string;
  'suite.framework': string;
  'suite.testIds': string[];
  'report.generatedAt': string;
  'report.count': number;
  'report.history': FlakySuiteReportSnapshot[];
}

export const flakySuiteIssueTitle = (suite: Pick<FlakySuite, 'filePath'>): string =>
  `${FLAKY_TEST_SUITE_TITLE_PREFIX} ${suite.filePath}`;

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
  const count: unknown = getIssueMetadata(
    body,
    'report.count',
    0,
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
};

/** ISO timestamp of the report that last wrote the issue body, if any. */
export const readReportGeneratedAt = (body: string): string | undefined => {
  const generatedAt: unknown = getIssueMetadata(
    body,
    'report.generatedAt',
    undefined,
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
  return typeof generatedAt === 'string' ? generatedAt : undefined;
};

const isSnapshot = (value: unknown): value is FlakySuiteReportSnapshot =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FlakySuiteReportSnapshot).generatedAt === 'string' &&
  Number.isFinite((value as FlakySuiteReportSnapshot).builds) &&
  Number.isFinite((value as FlakySuiteReportSnapshot).failedBuilds);

/** Snapshots recorded in an issue body by earlier reports; malformed entries are dropped. */
export const readReportHistory = (body: string): FlakySuiteReportSnapshot[] => {
  const history: unknown = getIssueMetadata(
    body,
    'report.history',
    [],
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
  return Array.isArray(history) ? history.filter(isSnapshot) : [];
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

const BUILDKITE_BUILD_URL = /buildkite\.com\/[^/]+\/([^/]+)\/builds\/(\d+)/;

/** `kibana-on-merge #12345` when the URL is a Buildkite build, otherwise a generic label. */
const buildLabel = (buildUrl: string | undefined): string => {
  const match = buildUrl?.match(BUILDKITE_BUILD_URL);
  return match ? `${match[1]} #${match[2]}` : 'build';
};

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

const rateOf = ({ builds, failedBuilds }: FlakySuiteReportSnapshot): number =>
  builds > 0 ? failedBuilds / builds : 0;

const currentSnapshot = (suite: FlakySuite, report: FlakyTestReport): FlakySuiteReportSnapshot => {
  const [worst] = suite.tests;
  return {
    generatedAt: report.generatedAt.toISOString(),
    builds: worst.builds,
    failedBuilds: worst.failedBuilds,
  };
};

/**
 * Earlier snapshots plus this report's, oldest first, capped so the footer cannot grow forever.
 * Re-applying the same report (a retried CI step) replaces its snapshot instead of adding one.
 */
const reportHistory = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext
): FlakySuiteReportSnapshot[] => {
  const current = currentSnapshot(suite, ctx.report);
  return [
    ...ctx.history.filter((snapshot) => snapshot.generatedAt !== current.generatedAt),
    current,
  ].slice(-MAX_HISTORY_ENTRIES);
};

/** How the fail rate moved across the reports that flagged the suite; omitted for the first. */
const trendLine = (suite: FlakySuite, ctx: FlakySuiteIssueContext): string | undefined => {
  if (ctx.reportCount < 2) {
    return undefined;
  }
  const snapshots = reportHistory(suite, ctx);
  const flagged = `Flagged by **${plural(ctx.reportCount, 'report')}** so far`;
  if (snapshots.length < 2) {
    return `> ${flagged}.`;
  }
  const rates = snapshots.map(rateOf);
  const [previous, current] = rates.slice(-2);
  const direction =
    current > previous + 0.005 ? 'rising' : current < previous - 0.005 ? 'falling' : 'unchanged';
  const sequence = rates
    .map((rate, index) =>
      index === rates.length - 1 ? `**${formatRate(rate)}**` : formatRate(rate)
    )
    .join(' → ');
  return `> ${flagged}, fail rate ${sequence} (${direction}).`;
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
const impactTable = (suite: FlakySuite, report: FlakyTestReport): string | undefined => {
  if (suite.tests.length === 1) {
    return undefined;
  }
  const { minBuilds } = report.thresholds;
  const rows = suite.tests.map((test) => {
    const flakiest = flakiestBranch(test.byBranch, minBuilds);
    return [
      test.title,
      `${test.failedBuilds}/${test.builds}`,
      formatRate(test.buildFailRate),
      String(test.retryFlakes),
      flakiest ? `${flakiest.branch} (${formatRate(flakiest.buildFailRate)})` : '-',
    ];
  });
  return `**Flaky tests** (ranked by failed builds)\n\n${table(
    ['Test', 'Failed builds', 'Fail rate', 'Retry flakes', 'Flakiest branch'],
    rows
  )}`;
};

const buildLink = ({ buildUrl }: FlakyTestSampleFailure): string => {
  const label = buildLabel(buildUrl);
  return buildUrl ? `[${label}](${buildUrl})` : label;
};

/**
 * One fenced block per distinct error text. A flaky test tends to fail the same way every time,
 * so the samples usually collapse into a single block listing the builds it was seen in.
 */
const distinctFailures = (samples: readonly FlakyTestSampleFailure[]): string[] => {
  const byText = new Map<string, FlakyTestSampleFailure[]>();
  for (const sample of samples) {
    const text = redactSensitiveGithubFailureText(
      truncateFailureBody(sample.message.trim(), MAX_SAMPLE_CHARACTERS)
    );
    byText.set(text, [...(byText.get(text) ?? []), sample]);
  }
  return [...byText.entries()].map(([text, occurrences]) => {
    const links = [...new Set(occurrences.map(buildLink))].join(', ');
    const latest = occurrences.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp;
    const when = `${occurrences.length > 1 ? 'latest ' : ''}${formatDateTime(latest)}`;
    // Four backticks so a message that itself contains a fenced block cannot break out
    return `${links} · ${when}\n\n\`\`\`\`\n${text}\n\`\`\`\``;
  });
};

const recentFailures = (suite: FlakySuite, testsWithSamples: number): string[] =>
  suite.tests
    .slice(0, testsWithSamples)
    .filter((test) => test.sampleFailures.length > 0)
    .map((test) => {
      const blocks = distinctFailures(test.sampleFailures);
      const samples = plural(test.sampleFailures.length, 'sample');
      const count =
        blocks.length < test.sampleFailures.length
          ? `${samples}, ${plural(blocks.length, 'distinct error')}`
          : samples;
      const summary =
        suite.tests.length === 1
          ? `Recent failures (${count})`
          : `Recent failures: ${test.title} (${count})`;
      return [
        '<details>',
        `<summary>${summary}</summary>`,
        '',
        blocks.join('\n\n'),
        '',
        '</details>',
      ].join('\n');
    });

const relatedIssuesSection = (relatedIssues: readonly RelatedIssue[]): string | undefined => {
  if (relatedIssues.length === 0) {
    return undefined;
  }
  const items = relatedIssues.map(
    (issue) => `- [#${issue.number}](${issue.html_url}) ${issue.title}`
  );
  return `**Related \`failed-test\` issues**\n\n${items.join('\n')}`;
};

const footer = ({ report, reportUrl }: FlakySuiteIssueContext): string => {
  const generatedAt = `generated ${formatDateTime(report.generatedAt)}`;
  const source = reportUrl
    ? `Source: [flaky_tests.json](${reportUrl}), ${generatedAt}`
    : `Source: flaky test report ${generatedAt}`;
  return [
    `Reproduce with the [flaky test runner](${FLAKY_TEST_RUNNER_URL})`,
    source,
    `[How this issue is generated and kept up to date](${HOW_IT_WORKS_URL})`,
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
  'report.count': ctx.reportCount,
  'report.history': reportHistory(suite, ctx),
});

const renderBody = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext,
  testsWithSamples: number
): string => {
  const sections = [
    headline(suite, ctx.report),
    trendLine(suite, ctx),
    suiteDetails(suite),
    impactTable(suite, ctx.report),
    ...recentFailures(suite, testsWithSamples),
    relatedIssuesSection(ctx.relatedIssues),
    footer(ctx),
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
export const renderFlakySuiteIssueBody = (
  suite: FlakySuite,
  ctx: FlakySuiteIssueContext
): string => {
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
