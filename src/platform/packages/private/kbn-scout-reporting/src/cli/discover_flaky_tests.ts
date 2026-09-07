/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
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
  FLAKY_TEST_REPORT_MAX_LOOKBACK_DAYS,
  ScoutFlakyTests,
  TEST_FRAMEWORKS,
  type FlakyTestEntry,
  type FlakyTestReport,
  type TestFramework,
} from '../reporting/flaky_tests';

// The per-framework aggregations scan hundreds of millions of documents; the client default of
// 60s is not enough for them.
const ES_REQUEST_TIMEOUT_MS = 300_000;

const defaults = DEFAULT_FLAKY_TEST_REPORT_OPTIONS;

// Short names for the help text so its lines stay readable
const DEFAULT_OUTPUT_PATH = path.relative(REPO_ROOT, SCOUT_FLAKY_TESTS_PATH);
const MAX_DAYS = FLAKY_TEST_REPORT_MAX_LOOKBACK_DAYS;
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

const TITLE_COL_WIDTH = 64;
const FILE_COL_WIDTH = 60;

// cli-table3 only wraps on whitespace and truncates anything longer, so break paths on `/`
const wrapPath = (filePath: string, width: number): string => {
  const lines: string[] = [];
  let current = '';
  for (const segment of filePath.split('/')) {
    const candidate = current ? `${current}/${segment}` : segment;
    if (candidate.length > width && current) {
      lines.push(`${current}/`);
      current = segment;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines.join('\n');
};

const groupByFile = (entries: readonly FlakyTestEntry[]): Map<string, FlakyTestEntry[]> => {
  const groups = new Map<string, FlakyTestEntry[]>();
  for (const entry of entries) {
    groups.set(entry.filePath, [...(groups.get(entry.filePath) ?? []), entry]);
  }
  return groups;
};

/**
 * Renders the top-ranked tests one per row, with the file cell spanning the rows of its tests
 * (in order of first appearance) so whole-suite failures stand out.
 */
const buildTopFlakyTable = (
  top: readonly FlakyTestEntry[],
  all: readonly FlakyTestEntry[]
): CliTable3.Table => {
  const table = new CliTable3({
    head: ['#', 'Failed builds', 'Fail rate', 'Test', 'File'],
    colWidths: [null, null, null, TITLE_COL_WIDTH, FILE_COL_WIDTH],
    wordWrap: true,
  });
  const qualifyingPerFile = groupByFile(all);

  let rank = 0;
  for (const [filePath, entries] of groupByFile(top)) {
    const [{ framework, owners }] = entries;
    const notShown = (qualifyingPerFile.get(filePath)?.length ?? 0) - entries.length;
    const fileCell: CliTable3.Cell = {
      rowSpan: entries.length,
      content: [
        // cell padding takes 2 columns and a broken line ends in `/`
        wrapPath(filePath, FILE_COL_WIDTH - 3),
        `[${framework}] ${owners.join(', ') || '-'}`,
        notShown > 0 ? `(+${notShown} more flaky in this file)` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };

    entries.forEach((entry, index) => {
      rank += 1;
      table.push([
        rank,
        `${entry.failedBuilds}/${entry.builds}`,
        `${(entry.buildFailRate * 100).toFixed(1)}%`,
        entry.title,
        ...(index === 0 ? [fileCell] : []),
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
        flaky
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
  flaky test report and store it locally under ${DEFAULT_OUTPUT_PATH}. Read-only.

  Examples:
    # Last ${DEF_DAYS} days of ${DEF_PIPELINES}, all frameworks
    node scripts/scout discover-flaky-tests

    # Include PR builds and widen the window
    node scripts/scout discover-flaky-tests --pipelines kibana-on-merge,kibana-pull-request --lookbackDays 14

    # Only Jest and FTR, custom output path, summary suppressed
    node scripts/scout discover-flaky-tests --frameworks jest,ftr --output target/flaky.json --quiet
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
      'output',
    ],
    boolean: ['verifyTLSCerts'],
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
      output: DEFAULT_OUTPUT_PATH,
    },
    help: `
    --esURL            (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
    --esAPIKey         (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
    --esMaxRetries     (optional)  How many times should Elasticsearch API requests be retried (default: 1)
    --verifyTLSCerts   (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
    --lookbackDays     (optional)  Days to aggregate, at most ${MAX_DAYS} (default: ${DEF_DAYS})
    --pipelines        (optional)  Comma-separated Buildkite pipeline slugs (default: ${DEF_PIPELINES})
    --branches         (optional)  Comma-separated branches; no filter when omitted
    --frameworks       (optional)  Comma-separated subset of ${ALL_FRAMEWORKS} (default: all)
    --minBuilds        (optional)  Ignore tests seen in fewer builds (default: ${DEF_MIN_BUILDS})
    --minFailedBuilds  (optional)  Ignore tests that failed in fewer builds (default: ${DEF_MIN_FAILED})
    --maxTests         (optional)  Maximum tests per list in the report (default: ${DEF_MAX_TESTS})
    --samplesPerTest   (optional)  Recent failure messages per test (default: ${DEF_SAMPLES})
    --output           (optional)  Report path, relative to repo root (default: ${DEFAULT_OUTPUT_PATH})
    `,
  },
  run: async ({ flagsReader, log }) => {
    const esURL = flagsReader.requiredString('esURL');
    const esAPIKey = flagsReader.requiredString('esAPIKey');
    const outputPath = path.resolve(REPO_ROOT, flagsReader.requiredString('output'));
    const frameworks = readFrameworks(flagsReader);
    const lookbackDays = flagsReader.requiredNumber('lookbackDays');
    if (!Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > MAX_DAYS) {
      throw createFlagError(`--lookbackDays must be an integer between 1 and ${MAX_DAYS}`);
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
