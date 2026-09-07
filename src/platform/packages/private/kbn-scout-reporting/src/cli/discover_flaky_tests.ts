/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import chalk from 'chalk';
import CliTable3 from 'cli-table3';
import dedent from 'dedent';
import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  SCOUT_FLAKY_TESTS_PATH,
  SCOUT_REPORTER_ES_API_KEY,
  SCOUT_REPORTER_ES_URL,
  SCOUT_REPORTER_ES_VERIFY_CERTS,
} from '@kbn/scout-info';
import { getValidatedESClient } from '../helpers/elasticsearch';
import {
  DEFAULT_FLAKY_TEST_REPORT_OPTIONS,
  ScoutFlakyTests,
  TEST_FRAMEWORKS,
  type FlakyTestBranchStats,
  type FlakyTestEntry,
  type FlakyTestReport,
  type TestFramework,
} from '../reporting/flaky_tests';

// The per-framework aggregations scan hundreds of millions of documents; the client default of
// 60s is not enough for them.
const ES_REQUEST_TIMEOUT_MS = 300_000;

const defaults = DEFAULT_FLAKY_TEST_REPORT_OPTIONS;

// Short names for the help text so its lines stay readable
const DEF_DAYS = defaults.lookbackDays;
const DEF_PIPELINES = defaults.pipelines.join(',');
const ALL_FRAMEWORKS = TEST_FRAMEWORKS.join(',');
const DEF_MIN_BUILDS = defaults.thresholds.minBuilds;
const DEF_MIN_FAILED = defaults.thresholds.minFailedBuilds;
const DEF_MAX_TESTS = defaults.thresholds.maxTests;
const DEF_SAMPLES = defaults.samplesPerTest;

/** Reads a flag that may be repeated or comma-separated into a de-duplicated list. */
const readList = (flagsReader: FlagsReader, key: string): string[] => [
  ...new Set(
    (flagsReader.arrayOfStrings(key) ?? [])
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
  ),
];

const isTestFramework = (value: string): value is TestFramework =>
  (TEST_FRAMEWORKS as readonly string[]).includes(value);

const readFrameworks = (flagsReader: FlagsReader): TestFramework[] => {
  const frameworks = readList(flagsReader, 'frameworks');
  const invalid = frameworks.filter((value) => !isTestFramework(value));
  if (invalid.length > 0) {
    throw createFlagError(
      `--frameworks contains unknown value(s) ${invalid.join(
        ', '
      )}; expected any of ${TEST_FRAMEWORKS.join(', ')}`
    );
  }
  return frameworks.filter(isTestFramework);
};

const TITLE_COL_WIDTH = 50;
const FILE_COL_WIDTH = 46;
const OWNERS_COL_WIDTH = 34;

// cell padding takes 2 columns and a broken line ends in the separator
const contentWidth = (colWidth: number): number => colWidth - 3;

/**
 * cli-table3 only wraps on whitespace and truncates anything longer, so break paths on `/` and
 * owner handles on `-` ourselves, keeping the separator at the end of the broken line.
 */
const wrapOn = (text: string, separator: string, width: number): string => {
  const lines: string[] = [];
  let current = '';
  for (const segment of text.split(separator)) {
    const candidate = current ? `${current}${separator}${segment}` : segment;
    if (candidate.length > width && current) {
      lines.push(`${current}${separator}`);
      current = segment;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines.join('\n');
};

const formatAge = (from: Date, to: Date): string => {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (24 * 60))}d ago`;
};

const formatRate = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

/**
 * Branch with the highest build failure rate. Branches with fewer builds than `minBuilds` only
 * count when no branch has enough, so one failure on a barely exercised branch does not win.
 */
const flakiestBranch = (
  byBranch: FlakyTestEntry['byBranch'],
  minBuilds: number
): FlakyTestBranchStats | undefined => {
  const exercised = byBranch.filter((stats) => stats.builds >= minBuilds);
  return [...(exercised.length > 0 ? exercised : byBranch)].sort(
    (a, b) => b.buildFailRate - a.buildFailRate
  )[0];
};

const formatFlakiestBranch = (flakiest: FlakyTestBranchStats | undefined): string =>
  flakiest ? `${flakiest.branch} (${formatRate(flakiest.buildFailRate)})` : '-';

/** Latest run on the flakiest branch, falling back to the latest run on any branch. */
const formatLatestRun = (
  entry: FlakyTestEntry,
  flakiest: FlakyTestBranchStats | undefined,
  now: Date
): string => {
  const latestRun = flakiest?.latestRun ?? entry.latestRun;
  return latestRun ? `${latestRun.status}\n${formatAge(latestRun.timestamp, now)}` : '-';
};

const groupByFile = (entries: readonly FlakyTestEntry[]): Map<string, FlakyTestEntry[]> => {
  const groups = new Map<string, FlakyTestEntry[]>();
  for (const entry of entries) {
    groups.set(entry.filePath, [...(groups.get(entry.filePath) ?? []), entry]);
  }
  return groups;
};

/**
 * Renders the top-ranked tests one per row. File, framework and owners are per-file, so their
 * cells span the rows of that file's tests (in order of first appearance) and whole-suite
 * failures stand out.
 */
const buildTopFlakyTable = (
  top: readonly FlakyTestEntry[],
  all: readonly FlakyTestEntry[],
  minBuilds: number,
  now: Date
): CliTable3.Table => {
  const table = new CliTable3({
    head: [
      '#',
      'Failed builds',
      'Flakiest branch',
      'Latest',
      'Test',
      'File',
      'Framework',
      'Owners',
    ],
    colWidths: [null, null, null, null, TITLE_COL_WIDTH, FILE_COL_WIDTH, null, OWNERS_COL_WIDTH],
    wordWrap: true,
  });
  const qualifyingPerFile = groupByFile(all);

  let rank = 0;
  for (const [filePath, entries] of groupByFile(top)) {
    const [{ framework, owners }] = entries;
    const notShown = (qualifyingPerFile.get(filePath)?.length ?? 0) - entries.length;
    const rowSpan = entries.length;
    const fileCells: CliTable3.Cell[] = [
      {
        rowSpan,
        content: [
          chalk.yellow(wrapOn(filePath, '/', contentWidth(FILE_COL_WIDTH))),
          notShown > 0 ? `(+${notShown} more flaky in this file)` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
      { rowSpan, content: framework },
      {
        rowSpan,
        content:
          owners.map((owner) => wrapOn(owner, '-', contentWidth(OWNERS_COL_WIDTH))).join('\n') ||
          '-',
      },
    ];

    entries.forEach((entry, index) => {
      rank += 1;
      const flakiest = flakiestBranch(entry.byBranch, minBuilds);
      table.push([
        rank,
        `${entry.failedBuilds}/${entry.builds}\n${formatRate(entry.buildFailRate)}`,
        formatFlakiestBranch(flakiest),
        formatLatestRun(entry, flakiest, now),
        entry.title,
        ...(index === 0 ? fileCells : []),
      ]);
    });
  }

  return table;
};

const displaySummary = (report: FlakyTestReport, limit: number, log: ToolingLog): void => {
  const { window, scope, summary, flaky } = report;
  const flakyByFramework = Object.entries(summary.flakyByFramework)
    .map(([framework, count]) => `${framework}: ${count}`)
    .join(', ');

  const panel = new CliTable3();
  panel.push(
    [{ content: 'Flaky tests summary', hAlign: 'center' }],
    [
      dedent(`\
        Window
          From     : ${window.from.toISOString()}
          To       : ${window.to.toISOString()}
          Lookback : ${window.lookbackDays}d
        `),
    ],
    [
      dedent(`\
        Scope
          Pipelines  : ${scope.pipelines.join(', ') || 'any'}
          Branches   : ${scope.branches.join(', ') || 'any'}
          Frameworks : ${scope.frameworks.join(', ')}
        `),
    ],
    [
      dedent(`\
        Results
          Flaky                : ${summary.totalFlaky}${
        flakyByFramework ? ` (${flakyByFramework})` : ''
      }
          Consistently failing : ${summary.totalConsistentlyFailing}
        `),
    ]
  );

  if (flaky.length > 0) {
    const top = flaky.slice(0, limit);
    panel.push([
      `Top ${top.length} flaky tests by failed builds\n${buildTopFlakyTable(
        top,
        flaky,
        report.thresholds.minBuilds,
        report.generatedAt
      ).toString()}`,
    ]);
  }

  log.write('\n');
  log.write(panel.toString());
};

export const discoverFlakyTests: Command<void> = {
  name: 'discover-flaky-tests',
  description: `
  Aggregate Scout test events (Jest, FTR, Cypress, Playwright) from Elasticsearch into a
  flaky test report and store it locally under ${SCOUT_FLAKY_TESTS_PATH}. Read-only.

  Examples:
    # Last ${DEF_DAYS} days of ${DEF_PIPELINES}, all frameworks
    node scripts/scout discover-flaky-tests

    # Include PR builds and widen the window
    node scripts/scout discover-flaky-tests --pipelines kibana-on-merge,kibana-pull-request --lookbackDays 14

    # Only Jest and FTR, custom output path, summary suppressed
    node scripts/scout discover-flaky-tests --frameworks jest,ftr --outputPath target/flaky.json --quiet

    # Leave out tests that have already been skipped
    node scripts/scout discover-flaky-tests --excludeSkipped
  `,
  flags: {
    string: [
      'esURL',
      'esAPIKey',
      'esMaxRetries',
      'lookbackDays',
      'pipelines',
      'branches',
      'frameworks',
      'minBuilds',
      'minFailedBuilds',
      'maxTests',
      'samplesPerTest',
      'outputPath',
    ],
    boolean: ['verifyTLSCerts', 'excludeSkipped'],
    default: {
      esURL: SCOUT_REPORTER_ES_URL,
      esAPIKey: SCOUT_REPORTER_ES_API_KEY,
      esMaxRetries: '1',
      verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
      lookbackDays: String(defaults.lookbackDays),
      pipelines: defaults.pipelines.join(','),
      minBuilds: String(defaults.thresholds.minBuilds),
      minFailedBuilds: String(defaults.thresholds.minFailedBuilds),
      maxTests: String(defaults.thresholds.maxTests),
      samplesPerTest: String(defaults.samplesPerTest),
      outputPath: SCOUT_FLAKY_TESTS_PATH,
    },
    help: `
    --esURL            (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey         (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --esMaxRetries     (optional)  How many times should Elasticsearch API requests be retried [default: 1]
    --verifyTLSCerts   (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
    --lookbackDays     (optional)  How many days to look back when aggregating [default: ${DEF_DAYS}]
    --pipelines        (optional)  Comma-separated Buildkite pipeline slugs [default: ${DEF_PIPELINES}]
    --branches         (optional)  Comma-separated branches; no filter when omitted
    --frameworks       (optional)  Comma-separated subset of ${ALL_FRAMEWORKS} [default: all]
    --minBuilds        (optional)  Ignore tests seen in fewer builds [default: ${DEF_MIN_BUILDS}]
    --minFailedBuilds  (optional)  Ignore tests that failed in fewer builds [default: ${DEF_MIN_FAILED}]
    --maxTests         (optional)  Maximum tests per list in the report [default: ${DEF_MAX_TESTS}]
    --samplesPerTest   (optional)  Recent failure messages per test [default: ${DEF_SAMPLES}]
    --excludeSkipped   (optional)  Leave out tests whose latest run was skipped [default: false]
    --outputPath       (optional)  Where to write the flaky test report [default: ${SCOUT_FLAKY_TESTS_PATH}]
    `,
  },
  run: async ({ flagsReader, log }) => {
    const esURL = flagsReader.requiredString('esURL');
    const esAPIKey = flagsReader.requiredString('esAPIKey');
    const outputPath = path.resolve(REPO_ROOT, flagsReader.requiredString('outputPath'));
    const frameworks = readFrameworks(flagsReader);
    const lookbackDays = flagsReader.requiredNumber('lookbackDays');
    if (!Number.isInteger(lookbackDays) || lookbackDays < 1) {
      throw createFlagError('--lookbackDays must be a positive integer');
    }

    log.info(`Connecting to Elasticsearch at ${esURL}`);
    const es = await getValidatedESClient(
      {
        node: esURL,
        auth: { apiKey: esAPIKey },
        tls: { rejectUnauthorized: flagsReader.boolean('verifyTLSCerts') },
        requestTimeout: ES_REQUEST_TIMEOUT_MS,
        maxRetries: flagsReader.requiredNumber('esMaxRetries'),
      },
      { log, cli: true }
    );

    const flakyTests = await ScoutFlakyTests.fromElasticsearch(
      es,
      {
        lookbackDays,
        pipelines: readList(flagsReader, 'pipelines'),
        branches: readList(flagsReader, 'branches'),
        frameworks: frameworks.length > 0 ? frameworks : defaults.frameworks,
        thresholds: {
          minBuilds: flagsReader.requiredNumber('minBuilds'),
          minFailedBuilds: flagsReader.requiredNumber('minFailedBuilds'),
          maxTests: flagsReader.requiredNumber('maxTests'),
        },
        samplesPerTest: flagsReader.requiredNumber('samplesPerTest'),
        excludeSkipped: flagsReader.boolean('excludeSkipped'),
      },
      log
    );

    const { data: report } = flakyTests;

    log.info(
      `Writing ${report.summary.totalFlaky} flaky and ${report.summary.totalConsistentlyFailing}` +
        ` consistently failing tests to ${outputPath}`
    );
    flakyTests.writeToFile(outputPath);

    // `--quiet` is one of the runner's built-in log level flags; honour it for the summary too
    if (!flagsReader.boolean('quiet')) {
      displaySummary(report, 10, log);
    }

    log.success(`Finished in ${(performance.now() / 1000).toFixed(2)}s`);
  },
};
