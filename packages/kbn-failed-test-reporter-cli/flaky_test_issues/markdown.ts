/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FlakyTestBranchStats,
  FlakyTestEntry,
  FlakyTestReport,
  TestFramework,
} from '@kbn/scout-reporting';
import { redactSensitiveGithubFailureText } from '../failed_tests_reporter/report_failure';

/** Markdown building blocks of the flaky suite issue body. */

export const FRAMEWORK_LABELS: Record<TestFramework, { short: string; long: string }> = {
  playwright: { short: 'Scout', long: 'Scout (Playwright)' },
  ftr: { short: 'FTR', long: 'FTR' },
  jest: { short: 'Jest', long: 'Jest' },
  cypress: { short: 'Cypress', long: 'Cypress' },
};

export const KIBANA_BLOB_URL = 'https://github.com/elastic/kibana/blob/main';
export const BUILDKITE_ORG_URL = 'https://buildkite.com/elastic';
/** The Scout dashboard of a single test: its flaky rate, failures and runs over time. */
export const SCOUT_TEST_DASHBOARD_URL =
  'https://appex-qa.kb.europe-west1.gcp.cloud.es.io/s/scout/app/dashboards#/view/a06c26f6-23ac-479d-acb5-5a8b234793a8';

/** A rison string literal: single quotes, with `!` and `'` escaped by `!`. */
const risonString = (value: string): string => `'${value.replace(/!/g, '!!').replace(/'/g, "!'")}'`;

/** The Scout dashboard filtered on one test id. */
export const testDashboardUrl = (testId: string): string =>
  encodeURI(
    `${SCOUT_TEST_DASHBOARD_URL}?_g=(filters:!((meta:(alias:'Test ID',disabled:!f,negate:!f),` +
      `query:(bool:(must:!((match_phrase:(test.id:${risonString(testId)}))))))))`
  );

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Markdown table cells cannot contain pipes or line breaks. */
export const cell = (value: string): string =>
  value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
export const inlineCode = (value: string): string => `\`${value.replace(/`/g, '')}\``;
export const tableRow = (cells: string[]): string => `| ${cells.map(cell).join(' | ')} |`;
export const table = (header: string[], rows: string[][]): string =>
  [tableRow(header), `|${header.map(() => '---').join('|')}|`, ...rows.map(tableRow)].join('\n');

export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/** `19%`, or `<1%` for a rate that is positive but rounds down to nothing. */
export const formatPercent = (rate: number): string => {
  const percent = Math.round(rate * 100);
  return percent === 0 && rate > 0 ? '<1%' : `${percent}%`;
};

/** `98 / 505 (19%)` */

/** `2026-09-08 16:05 UTC` */
export const formatDateTime = (date: Date): string =>
  `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** `8 Sep`, or `8 Sep 2026` with the year. */
export const formatDay = (date: Date, withYear = false): string =>
  `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${
    withYear ? ` ${date.getUTCFullYear()}` : ''
  }`;

/** `3–10 Sep 2026`, `28 Aug – 4 Sep 2026` or `28 Dec 2025 – 4 Jan 2026`. */
export const formatDateRange = (from: Date, to: Date): string => {
  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${formatDay(from, true)} – ${formatDay(to, true)}`;
  }
  if (from.getUTCMonth() !== to.getUTCMonth()) {
    return `${formatDay(from)} – ${formatDay(to, true)}`;
  }
  return `${from.getUTCDate()}–${formatDay(to, true)}`;
};

/** `` `kibana-on-merge`, `kibana-pull-request` `` */
export const formatPipelines = (report: FlakyTestReport): string =>
  report.scope.pipelines.map(inlineCode).join(', ');

export type BranchFailures = Pick<FlakyTestBranchStats, 'branch' | 'builds' | 'failedBuilds'>;

/**
 * Branches ordered by failed builds, most first. Over several tests the failed builds add up
 * (a build failing two tests counts twice), which is fine for ordering but not for exact counts.
 */
export const branchesByFailedBuilds = (
  tests: readonly Pick<FlakyTestEntry, 'byBranch'>[]
): BranchFailures[] => {
  const byBranch = new Map<string, BranchFailures>();
  for (const test of tests) {
    for (const { branch, builds, failedBuilds } of test.byBranch) {
      const existing = byBranch.get(branch);
      byBranch.set(branch, {
        branch,
        builds: Math.max(existing?.builds ?? 0, builds),
        failedBuilds: (existing?.failedBuilds ?? 0) + failedBuilds,
      });
    }
  }
  return [...byBranch.values()].sort(
    (a, b) => b.failedBuilds - a.failedBuilds || a.branch.localeCompare(b.branch)
  );
};

/** The thresholds a branch has to clear on its own for the test to count as flaky there. */
export type BranchThresholds = Pick<
  FlakyTestReport['thresholds'],
  'minBuilds' | 'minFailedBuilds' | 'minFailRate'
>;

/** Whether the test qualified as flaky on this branch: enough builds and failures, high enough rate. */
export const isFlakyBranch = (
  stats: Pick<FlakyTestBranchStats, 'builds' | 'failedBuilds' | 'buildFailRate'>,
  { minBuilds, minFailedBuilds, minFailRate }: BranchThresholds
): boolean =>
  stats.builds >= minBuilds &&
  stats.failedBuilds >= minFailedBuilds &&
  stats.buildFailRate >= minFailRate;

/**
 * `` **`9.5` 3% (4 / 122)** ``, one line per branch on which the test clears every threshold of the
 * report, highest rate first. The total over branches is left out on purpose, a clean branch
 * dilutes it below what qualified.
 */
export const formatBranchRates = (
  test: Pick<FlakyTestEntry, 'byBranch'>,
  thresholds: BranchThresholds
): string => {
  const flaky = test.byBranch.filter((stats) => isFlakyBranch(stats, thresholds));
  if (flaky.length === 0) {
    return '-';
  }
  return flaky
    .sort(
      (a, b) =>
        b.buildFailRate - a.buildFailRate ||
        b.failedBuilds - a.failedBuilds ||
        a.branch.localeCompare(b.branch)
    )
    .map(
      ({ branch, builds, failedBuilds, buildFailRate }) =>
        `**${inlineCode(branch)} ${formatPercent(buildFailRate)} (${failedBuilds} / ${builds})**`
    )
    .join('<br>');
};

/**
 * Rows of the per-test table, with a link to each test's dashboard unless told otherwise; the
 * suite's tests come ranked.
 */
export const testsTable = (
  tests: readonly FlakyTestEntry[],
  {
    withDashboardLinks,
    maxRows,
    thresholds,
  }: { withDashboardLinks: boolean; maxRows: number; thresholds: BranchThresholds }
): string => {
  const header = ['Test', 'Flaky branches'];
  const rows = tests
    .slice(0, maxRows)
    .map((test) => [
      test.title,
      formatBranchRates(test, thresholds),
      ...(withDashboardLinks ? [`[dashboard](${testDashboardUrl(test.testId)})`] : []),
    ]);
  const rest = tests.length - maxRows;
  return [
    table(withDashboardLinks ? [...header, 'Dashboard'] : header, rows),
    ...(rest > 0 ? [`and ${plural(rest, 'more flaky test')} in this file.`] : []),
  ].join('\n\n');
};

const MAX_FAILURE_LINES = 12;
const MAX_FAILURE_CHARACTERS = 1200;

/** A failure message safe to post publicly, cut to its first lines, fences neutralised. */
export const formatFailureMessage = (message: string): string => {
  const redacted = redactSensitiveGithubFailureText(message).replace(/```/g, '` ` `').trim();
  const lines = redacted.split('\n');
  let text = lines.slice(0, MAX_FAILURE_LINES).join('\n');
  if (text.length > MAX_FAILURE_CHARACTERS) {
    text = text.slice(0, MAX_FAILURE_CHARACTERS);
  }
  return text.length < redacted.length ? `${text}\n…` : text;
};

export const codeBlock = (text: string): string => `\`\`\`text\n${text}\n\`\`\``;

/** `[#498441](https://buildkite.com/elastic/kibana-pull-request/builds/498441) · 2026-09-08 16:05 UTC` */
export const formatBuildLink = (buildUrl: string | undefined, at: Date | undefined): string => {
  const number = buildUrl?.match(/\/builds\/(\d+)/)?.[1];
  const link = buildUrl ? `[${number ? `#${number}` : 'build'}](${buildUrl})` : undefined;
  const time = at ? formatDateTime(at) : undefined;
  return [link, time].filter((part) => part !== undefined).join(' · ') || '-';
};

/** Newest sampled failure of a suite, across its tests. */
export const latestSampleFailure = (tests: readonly FlakyTestEntry[]) =>
  tests
    .flatMap((test) => test.sampleFailures)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

/** Shortens a test title for prose, e.g. `does not keep a hidden histogram…`. */
export const shortTitle = (title: string, maxLength = 40): string =>
  title.length <= maxLength ? title : `${title.slice(0, maxLength - 1).trimEnd()}…`;
