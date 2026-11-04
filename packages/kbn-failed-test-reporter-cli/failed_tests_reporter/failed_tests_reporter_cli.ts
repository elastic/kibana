/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  SCOUT_REPORTER_ES_API_KEY,
  SCOUT_REPORTER_ES_URL,
  SCOUT_REPORTER_ES_VERIFY_CERTS,
} from '@kbn/scout-info';
import { getValidatedESClient } from '@kbn/scout-reporting';
import type { ToolingLog } from '@kbn/tooling-log';
import { globby } from 'globby';
import normalize from 'normalize-path';
import { getBuildkiteMetadata } from './buildkite_metadata';
import { reportConsistentFailureIssues } from './consistent_failure_issues';
import { ExistingFailedTestIssues } from './existing_failed_test_issues';
import { generateScoutTestFailureArtifacts } from './generate_scout_test_failure_artifacts';
import type { TestFailure } from './get_failures';
import { GithubApi } from './github_api';
import { processJUnitReports } from './process_junit_reports';
import type { ProcessReportsParams } from './process_reports_types';
import { processScoutReports } from './process_scout_reports';

const DEFAULT_PATTERNS = [Path.resolve(REPO_ROOT, 'target/junit/**/*.xml')];
const DISABLE_MISSING_TEST_REPORT_ERRORS =
  process.env.DISABLE_MISSING_TEST_REPORT_ERRORS === 'true';
/** `owner/name`, as GitHub spells a repository. */
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

/**
 * Checks the job's failures for tests that fail every attempt build after build, by the Scout
 * test events, and files a suite issue in `repo` for each file that does. Skipped, with a
 * warning, outside Buildkite or without the test events cluster.
 */
async function checkConsistentFailures({
  log,
  failures,
  repo,
  dryRun,
}: {
  log: ToolingLog;
  failures: TestFailure[];
  repo: string;
  dryRun: boolean;
}) {
  const { BUILDKITE_PIPELINE_SLUG: pipeline, BUILDKITE_BRANCH: branch } = process.env;
  if (!pipeline || !branch) {
    log.warning('Not in a Buildkite job, skipping the consistent failure check');
    return;
  }
  if (!SCOUT_REPORTER_ES_URL || !SCOUT_REPORTER_ES_API_KEY) {
    log.warning('SCOUT_REPORTER_ES_URL or API key not set, skipping the consistent failure check');
    return;
  }
  const es = await getValidatedESClient(
    {
      node: SCOUT_REPORTER_ES_URL,
      auth: { apiKey: SCOUT_REPORTER_ES_API_KEY },
      tls: { rejectUnauthorized: SCOUT_REPORTER_ES_VERIFY_CERTS },
    },
    { log }
  );
  try {
    await reportConsistentFailureIssues({
      log,
      failures,
      es,
      github: new GithubApi({ log, token: process.env.GITHUB_TOKEN, dryRun, repo }),
      repo,
      build: { pipeline, branch },
      dryRun,
    });
  } finally {
    await es.close();
  }
}

// Whether a failure no issue tracks yet gets a per-test issue (the legacy behaviour, default).
// 'false' leaves new issues to the daily flaky suite reporter and `--report-failing-suites`.
// Tracked issues are updated either way. Set in the pipeline env, flip back to fall back.
const PER_TEST_ISSUES = process.env.REPORT_FAILED_TESTS_PER_TEST_ISSUES !== 'false';

export function runFailedTestsReporterCli() {
  run(
    async ({ log, flags }) => {
      const indexInEs = Boolean(flags['index-errors']);
      const reportUpdate = Boolean(flags['report-update']);

      let updateGithub = Boolean(flags['github-update']);
      if (updateGithub && !process.env.GITHUB_TOKEN) {
        throw createFailError(
          'GITHUB_TOKEN environment variable must be set, otherwise use --no-github-update flag'
        );
      }

      const reportFailingSuites = Boolean(flags['report-failing-suites']);
      const failingSuitesRepo = flags['failing-suites-repo'];
      if (
        reportFailingSuites &&
        (typeof failingSuitesRepo !== 'string' || !REPO_PATTERN.test(failingSuitesRepo))
      ) {
        throw createFlagError('--failing-suites-repo must be of the form owner/name');
      }

      let branch: string = '';
      let pipeline: string = '';
      let prependTitle: string = '';
      if (updateGithub) {
        branch = process.env.BUILDKITE_BRANCH || '';
        pipeline = process.env.BUILDKITE_PIPELINE_SLUG || '';
        updateGithub = process.env.REPORT_FAILED_TESTS_TO_GITHUB === 'true';
        prependTitle = process.env.PREPEND_FAILURE_TITLE || '';

        if (!branch) {
          throw createFailError(
            'Unable to determine originating branch from job name or other environment variables'
          );
        }
      }

      const githubApi = new GithubApi({
        log,
        token: process.env.GITHUB_TOKEN,
        dryRun: !updateGithub,
      });

      const bkMeta = getBuildkiteMetadata();

      try {
        const buildUrl = flags['build-url'] || (updateGithub ? '' : 'http://buildUrl');
        if (typeof buildUrl !== 'string' || !buildUrl) {
          throw createFlagError('Missing --build-url or process.env.BUILD_URL');
        }

        const patterns = (flags._.length ? flags._ : DEFAULT_PATTERNS).map((p) =>
          normalize(Path.resolve(p))
        );
        log.info('Searching for reports at', patterns);
        const reportPaths = await globby(patterns, {
          absolute: true,
        });

        if (!reportPaths.length && DISABLE_MISSING_TEST_REPORT_ERRORS) {
          // it is fine for code coverage to not have test results
          return;
        }

        if (reportPaths.length) {
          log.info('found', reportPaths.length, 'reports', reportPaths);
          if (!PER_TEST_ISSUES) {
            log.info(
              'REPORT_FAILED_TESTS_PER_TEST_ISSUES=false: no per-test issues will be opened, only existing ones updated'
            );
          }

          // Separate JUnit and Scout reports
          const junitReports = reportPaths.filter((p) => p.endsWith('.xml'));
          const scoutReports = reportPaths.filter((p) => p.endsWith('.ndjson'));

          log.info(
            'Processing',
            junitReports.length,
            'JUnit reports and',
            scoutReports.length,
            'Scout reports'
          );

          const existingIssues = new ExistingFailedTestIssues(log);

          const processParams: ProcessReportsParams = {
            log,
            existingIssues,
            buildUrl,
            githubApi,
            branch,
            pipeline,
            prependTitle,
            updateGithub,
            perTestIssues: PER_TEST_ISSUES,
            indexInEs,
            reportUpdate,
            bkMeta,
          };

          // Process FTR JUnit reports
          const junitFailures = await processJUnitReports(junitReports, processParams);

          // Process Scout reports
          const scoutFailures = await processScoutReports(scoutReports, processParams);

          // Generate Scout test failure artifacts after reports are updated (GH issue info, html reports, etc.)
          await generateScoutTestFailureArtifacts({ log, bkMeta });

          if (reportFailingSuites && typeof failingSuitesRepo === 'string') {
            log.info(
              `Failing suite issues: on, filed in ${failingSuitesRepo} after the per-test issues`
            );
            // the per-test issues above are filed, the annotations still to come: never fail the job's reporting over this
            try {
              await checkConsistentFailures({
                log,
                failures: [...junitFailures, ...scoutFailures],
                repo: failingSuitesRepo,
                dryRun: !updateGithub,
              });
            } catch (error) {
              log.error(`The consistent failure check failed: ${error}`);
            }
          }
        }
      } finally {
        await CiStatsReporter.fromEnv(log).metrics([
          {
            group: 'github api request count',
            id: `failed test reporter`,
            value: githubApi.getRequestCount(),
            meta: Object.fromEntries(
              Object.entries(bkMeta).map(
                ([k, v]) => [`buildkite${k[0].toUpperCase()}${k.slice(1)}`, v] as const
              )
            ),
          },
        ]);
      }
    },
    {
      description: `a cli that opens issues or updates existing issues based on junit reports`,
      flags: {
        boolean: ['github-update', 'report-update', 'report-failing-suites'],
        string: ['build-url', 'failing-suites-repo'],
        default: {
          'github-update': true,
          'report-update': true,
          'index-errors': true,
          'build-url': process.env.BUILD_URL,
          'report-failing-suites': process.env.REPORT_FAILING_SUITES === 'true',
          'failing-suites-repo': process.env.FAILING_SUITES_REPO || 'elastic/kibana',
        },
        help: `
        --no-github-update       Execute the CLI without writing to Github
        --no-report-update       Execute the CLI without writing to the JUnit reports
        --no-index-errors        Execute the CLI without indexing failures into Elasticsearch
        --build-url              URL of the failed build, defaults to process.env.BUILD_URL

        Failing suite issues, filed in addition to the per-test issues above. Off unless
        process.env.REPORT_FAILING_SUITES is 'true'; writes follow --github-update.
        --report-failing-suites  Also file one issue per test file whose tests failed every attempt of
                                 the latest builds of this pipeline and branch after passing before,
                                 by the Scout test events
        --failing-suites-repo    owner/name of the repository those issues go to, defaults to
                                 process.env.FAILING_SUITES_REPO, then elastic/kibana
      `,
      },
    }
  );
}
