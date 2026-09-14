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
  FlakyTestTrend,
  TestFramework,
} from '@kbn/scout-reporting';
import { redactSensitiveGithubFailureText } from '../failed_tests_reporter/report_failure';

/** Markdown building blocks shared by the flaky suite issue body and the still-flaky comment. */

export const FRAMEWORK_LABELS: Record<TestFramework, { short: string; long: string }> = {
  playwright: { short: 'Scout', long: 'Scout (Playwright)' },
  ftr: { short: 'FTR', long: 'FTR' },
  jest: { short: 'Jest', long: 'Jest' },
  cypress: { short: 'Cypress', long: 'Cypress' },
};

export const KIBANA_BLOB_URL = 'https://github.com/elastic/kibana/blob/main';
export const BUILDKITE_ORG_URL = 'https://buildkite.com/elastic';

const SPARKLINE_LEVELS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;
/** Days without any build of the test, e.g. before it existed or on a quiet weekend. */
const SPARKLINE_NO_BUILDS = '·';

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
export const formatFailedBuilds = (failedBuilds: number, builds: number): string =>
  `${failedBuilds} / ${builds} (${formatPercent(builds > 0 ? failedBuilds / builds : 0)})`;

/** `2026-09-08 16:05 UTC` */
export const formatDateTime = (date: Date): string =>
  `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** `8 Sep`, or `8 Sep 2026` with the year. */
export const formatDay = (date: Date, withYear = false): string =>
  `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${withYear ? ` ${date.getUTCFullYear()}` : ''}`;

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

/** `on \`kibana-on-merge\` in the last 7 days (3–10 Sep 2026)` */
export const formatWindow = (report: FlakyTestReport): string =>
  `on ${formatPipelines(report)} in the last ${plural(report.window.lookbackDays, 'day')} ` +
  `(${formatDateRange(report.window.from, report.window.to)})`;

/**
 * One character per day, failed builds scaled to the busiest day of the series; days without
 * builds are dots so a gap reads differently from a green day.
 */
export const sparkline = (trend: FlakyTestTrend | undefined): string | undefined => {
  if (!trend || trend.days === 0) {
    return undefined;
  }
  const max = Math.max(...trend.failedBuildsPerDay, 1);
  const chars = trend.failedBuildsPerDay.map((failed, day) => {
    if ((trend.buildsPerDay[day] ?? 0) === 0) {
      return SPARKLINE_NO_BUILDS;
    }
    const level = Math.min(
      SPARKLINE_LEVELS.length - 1,
      Math.ceil((failed / max) * (SPARKLINE_LEVELS.length - 1))
    );
    return SPARKLINE_LEVELS[level];
  });
  return inlineCode(chars.join(''));
};

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

/** `` `main` · 98 / 505 ``, or just `` `main` `` when it is the only branch the test ran on. */
export const formatFlakiestBranch = (test: FlakyTestEntry): string => {
  const [flakiest] = branchesByFailedBuilds([test]);
  if (!flakiest) {
    return '-';
  }
  return test.byBranch.length > 1
    ? `${inlineCode(flakiest.branch)} · ${flakiest.failedBuilds} / ${flakiest.builds}`
    : inlineCode(flakiest.branch);
};

/** Rows of the per-test table, `Test ID` column optional; the suite's tests come ranked. */
export const testsTable = (
  tests: readonly FlakyTestEntry[],
  { withTestId, maxRows }: { withTestId: boolean; maxRows: number }
): string => {
  const header = ['Test', 'Failed builds', 'Flakiest branch', 'Trend (14d)'];
  const rows = tests.slice(0, maxRows).map((test) => [
    test.title,
    formatFailedBuilds(test.failedBuilds, test.builds),
    formatFlakiestBranch(test),
    sparkline(test.trend) ?? '-',
    ...(withTestId ? [test.testId] : []),
  ]);
  const rest = tests.length - maxRows;
  return [
    table(withTestId ? [...header, 'Test ID'] : header, rows),
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
