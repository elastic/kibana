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
  FlakyTestPipelineStats,
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

/** What a config runs, by its `test_run.config.category`; categories not listed here are not shown. */
export const CATEGORY_LABELS: Record<string, string> = {
  'ui-test': 'UI',
  'api-test': 'API',
  'unit-test': 'Unit',
  'unit-integration-test': 'Unit integration',
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

/**
 * Where a Scout target ran, from its location and the architecture its mode starts with:
 * `Local deployment` or `Local serverless simulation`, `ECH` (cloud stateful) or `MKI` (cloud
 * serverless). The bare location when either is unknown.
 */
export const targetEnvironment = ({ mode, type }: { mode: string; type: string }): string => {
  const arch = mode.split('-')[0];
  if (type === 'local') {
    if (arch === 'stateful') return 'Local deployment';
    if (arch === 'serverless') return 'Local serverless simulation';
  }
  if (type === 'cloud') {
    if (arch === 'stateful') return 'ECH';
    if (arch === 'serverless') return 'MKI';
  }
  return type;
};

/** `98 / 505 (**19%**)`, the rate in bold so it stands out in a table. */
export const formatFailedBuilds = ({
  builds,
  failedBuilds,
  buildFailRate,
}: Pick<FlakyTestBranchStats, 'builds' | 'failedBuilds' | 'buildFailRate'>): string =>
  `${failedBuilds} / ${builds} (**${formatPercent(buildFailRate)}**)`;

/** `2026-09-08 16:05 UTC` */
export const formatDateTime = (date: Date): string =>
  `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** `8 Sep`, or `8 Sep 2026` with the year. */
export const formatDay = (date: Date, withYear = false): string =>
  `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${
    withYear ? ` ${date.getUTCFullYear()}` : ''
  }`;

/** `3–10 Sep 2026`, `28 Aug – 4 Sep 2026`, `28 Dec 2025 – 4 Jan 2026`, or `7 Sep 2026` for one day. */
export const formatDateRange = (from: Date, to: Date): string => {
  if (from.toISOString().slice(0, 10) === to.toISOString().slice(0, 10)) {
    return formatDay(to, true);
  }
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
/**
 * The collapsed full message is bounded too: GitHub caps an issue body at 65,536 characters, and
 * four errors at this size leave the rest of the body more than half of it.
 */
const MAX_FULL_FAILURE_LINES = 300;
const MAX_FULL_FAILURE_CHARACTERS = 8_000;

/** A failure message safe to post publicly: redacted, fences neutralised, cut to the given size. */
const cutFailureMessage = (message: string, maxLines: number, maxCharacters: number): string => {
  const redacted = redactSensitiveGithubFailureText(message).replace(/```/g, '` ` `').trim();
  const lines = redacted.split('\n');
  let text = lines.slice(0, maxLines).join('\n');
  if (text.length > maxCharacters) {
    text = text.slice(0, maxCharacters);
  }
  return text.length < redacted.length ? `${text}\n…` : text;
};

/** The head of a failure message, what the issue shows inline. */
export const formatFailureMessage = (message: string): string =>
  cutFailureMessage(message, MAX_FAILURE_LINES, MAX_FAILURE_CHARACTERS);

/** The whole failure message, for the collapsed section, within the issue body's limits. */
export const formatFullFailureMessage = (message: string): string =>
  cutFailureMessage(message, MAX_FULL_FAILURE_LINES, MAX_FULL_FAILURE_CHARACTERS);

export const codeBlock = (text: string): string => `\`\`\`text\n${text}\n\`\`\``;

/** A `<details>` block, collapsed by default; blank lines keep the markdown inside rendering. */
export const collapsed = (summary: string, body: string): string =>
  `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;

/** A Buildkite build and, when known, the job within it that ran the test. */
export interface BuildkiteRef {
  buildUrl?: string;
  jobId?: string;
  /** Label of the step the job ran, e.g. `FTR Configs #21`. */
  stepLabel?: string;
}

/** The job's tab of the build page, which opens its log and artifacts; the build page without a job. */
export const buildkiteJobUrl = (buildUrl: string, jobId?: string): string =>
  jobId && !buildUrl.includes('#') ? `${buildUrl}#${jobId}` : buildUrl;

/**
 * `[#498441](https://buildkite.com/elastic/kibana-pull-request/builds/498441#0199-abcd) · FTR Configs #3 · 2026-09-08 16:05 UTC`,
 * with whichever parts are known.
 */
export const formatBuildLink = (
  { buildUrl, jobId, stepLabel }: BuildkiteRef,
  at: Date | undefined
): string => {
  const number = buildUrl?.match(/\/builds\/(\d+)/)?.[1];
  const link = buildUrl
    ? `[${number ? `#${number}` : 'build'}](${buildkiteJobUrl(buildUrl, jobId)})`
    : undefined;
  const time = at ? formatDateTime(at) : undefined;
  return [link, stepLabel, time].filter((part) => part !== undefined).join(' · ') || '-';
};

const MAX_BRANCH_NAMES = 4;

/**
 * Pull request builds record the head ref as `owner:branch`, or as `pull/<number>/head` on
 * pipelines that check the merge ref out; no release branch looks like either.
 */
export const isPullRequestRef = (branch: string): boolean =>
  branch.includes(':') || branch.startsWith('pull/');

/**
 * `` `main`, `8.19`, `9.4` ``, `57 PRs`, or `` `main`, 3 PRs `` for a mixed pipeline: the branches
 * a pipeline failed on, `main` first then sorted, at most four named before `+N more`. Falls back
 * to the count for reports written before the names were recorded.
 */
export const formatFailedBranches = ({
  failedBranches,
  failedBranchNames,
}: Pick<FlakyTestPipelineStats, 'failedBranches' | 'failedBranchNames'>): string => {
  if (!failedBranchNames) {
    return String(failedBranches);
  }
  const branches = failedBranchNames
    .filter((branch) => !isPullRequestRef(branch))
    .sort((a, b) => Number(b === 'main') - Number(a === 'main') || a.localeCompare(b));
  const pullRequests = failedBranchNames.length - branches.length;
  const parts = branches.slice(0, MAX_BRANCH_NAMES).map(inlineCode);
  if (branches.length > MAX_BRANCH_NAMES) {
    parts.push(`+${branches.length - MAX_BRANCH_NAMES} more`);
  }
  if (pullRequests > 0) {
    parts.push(plural(pullRequests, 'PR'));
  }
  return parts.join(', ') || String(failedBranches);
};

/** Newest sampled failure of a suite, across its tests. */
export const latestSampleFailure = (tests: readonly FlakyTestEntry[]) =>
  tests
    .flatMap((test) => test.sampleFailures)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

/** Shortens a test title for prose, e.g. `does not keep a hidden histogram…`. */
export const shortTitle = (title: string, maxLength = 40): string =>
  title.length <= maxLength ? title : `${title.slice(0, maxLength - 1).trimEnd()}…`;
