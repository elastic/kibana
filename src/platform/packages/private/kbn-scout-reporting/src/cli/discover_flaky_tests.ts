/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
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
  type TestFramework,
} from '../reporting/flaky_tests';
import { displaySummary } from './flaky_tests_summary';

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
    --outputPath       (optional)  Where to write the flaky test report [default: ${SCOUT_FLAKY_TESTS_PATH}]
    `,
  },
  run: async ({ flagsReader, log }) => {
    const startedAt = performance.now();
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

    log.success(`Finished in ${((performance.now() - startedAt) / 1000).toFixed(2)}s`);
  },
};
