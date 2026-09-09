/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { createFlagError } from '@kbn/dev-cli-errors';
import { run, type FlagsReader } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutFlakyTests } from '@kbn/scout-reporting';

import { DEFAULT_GITHUB_REPO, GithubApi } from '../failed_tests_reporter/github_api';
import {
  FAILED_TEST_ISSUE_POLICIES,
  FAILED_TEST_LABEL,
  reportFlakySuitesToGithub,
} from './reporter';

const DEFAULT_INPUT = 'target/flaky_tests/flaky_tests.json';
const DEFAULT_SUMMARY_PATH = 'target/flaky_tests/github_issues.json';
const DEFAULT_MAX_NEW_ISSUES = 10;
const DEFAULT_FAILED_TEST_ISSUE_POLICY = 'skip';

const readList = (flagsReader: FlagsReader, key: string): string[] => [
  ...new Set(
    (flagsReader.arrayOfStrings(key) ?? [])
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
  ),
];

export function runFlakyTestsReporterCli() {
  run(
    async ({ log, flagsReader }) => {
      const startedAt = performance.now();
      const inputPath = Path.resolve(REPO_ROOT, flagsReader.requiredString('input'));
      const summaryPath = Path.resolve(REPO_ROOT, flagsReader.requiredString('summary-path'));
      const dryRun = flagsReader.boolean('dry-run');
      const token = process.env.GITHUB_TOKEN;
      if (!token && !dryRun) {
        throw createFlagError('GITHUB_TOKEN must be set unless --dry-run is passed');
      }
      const maxNewIssues = flagsReader.requiredNumber('max-new-issues');
      if (!Number.isInteger(maxNewIssues) || maxNewIssues < 0) {
        throw createFlagError('--max-new-issues must be a non-negative integer');
      }
      const labels = readList(flagsReader, 'labels');
      if (!labels.includes(FAILED_TEST_LABEL)) {
        throw createFlagError(
          `--labels must include ${FAILED_TEST_LABEL}, otherwise issues cannot be found again`
        );
      }
      const failedTestIssuePolicy =
        flagsReader.enum('failed-test-issues', FAILED_TEST_ISSUE_POLICIES) ??
        DEFAULT_FAILED_TEST_ISSUE_POLICY;
      const reportUrl = flagsReader.string('report-url');
      const repo = flagsReader.requiredString('github-repo');
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        throw createFlagError('--github-repo must be of the form owner/name');
      }

      if (repo !== DEFAULT_GITHUB_REPO) {
        log.warning(`Filing issues against ${repo} instead of ${DEFAULT_GITHUB_REPO}`);
      }
      log.info(`Reading flaky test report from ${inputPath}`);
      const { data: report } = ScoutFlakyTests.fromFile(inputPath);
      if (dryRun) {
        log.warning('Dry run: GitHub requests are logged, not sent');
      }

      const summary = await reportFlakySuitesToGithub({
        report,
        github: new GithubApi({ log, token, dryRun, repo }),
        log,
        labels,
        maxNewIssues,
        failedTestIssuePolicy,
        reportUrl,
        dryRun,
      });

      Fs.mkdirSync(Path.dirname(summaryPath), { recursive: true });
      Fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      const { created, updated, reopened, skipped } = summary.counts;
      log.info(
        `${summary.suites} flaky suites: ${created} issues created, ${updated} updated, ` +
          `${reopened} reopened, ${skipped} skipped (summary in ${summaryPath})`
      );
      log.success(`Finished in ${((performance.now() - startedAt) / 1000).toFixed(2)}s`);
    },
    {
      description: `
        File one GitHub issue per flaky test suite found in a report written by
        \`node scripts/scout discover-flaky-tests\`, or bring the issue filed earlier for that suite
        up to date (reopening it when closed). Suites whose tests already have an open failed-test
        issue are skipped unless --failed-test-issues link is passed.

        Examples:
          # Preview what would be filed, without touching GitHub
          node scripts/report_flaky_tests --input .scout/flaky_tests.json --dry-run

          # File issues from a CI report, linking the report artifact from every issue
          GITHUB_TOKEN=... node scripts/report_flaky_tests --report-url https://buildkite.com/...
      `,
      flags: {
        string: [
          'input',
          'labels',
          'max-new-issues',
          'failed-test-issues',
          'report-url',
          'summary-path',
          'github-repo',
        ],
        boolean: ['dry-run'],
        default: {
          input: DEFAULT_INPUT,
          labels: FAILED_TEST_LABEL,
          'max-new-issues': String(DEFAULT_MAX_NEW_ISSUES),
          'failed-test-issues': DEFAULT_FAILED_TEST_ISSUE_POLICY,
          'summary-path': DEFAULT_SUMMARY_PATH,
          'github-repo': DEFAULT_GITHUB_REPO,
          'dry-run': false,
        },
        help: `
          --input               Flaky test report to read [default: ${DEFAULT_INPUT}]
          --dry-run             Log the GitHub requests instead of sending them; GITHUB_TOKEN becomes optional
          --labels              Comma-separated labels for new issues [default: ${FAILED_TEST_LABEL}]
          --max-new-issues      Maximum issues created per run; existing ones are always updated [default: ${DEFAULT_MAX_NEW_ISSUES}]
          --failed-test-issues  ${FAILED_TEST_ISSUE_POLICIES.join(
            ' or '
          )} suites that already have an open failed-test issue [default: ${DEFAULT_FAILED_TEST_ISSUE_POLICY}]
          --report-url          Link to the report, shown in every issue (e.g. the Buildkite artifact)
          --summary-path        Where to write the JSON summary of what was filed [default: ${DEFAULT_SUMMARY_PATH}]
          --github-repo         owner/name of the repository to file issues in, e.g. a sandbox for testing [default: ${DEFAULT_GITHUB_REPO}]
        `,
      },
    }
  );
}
