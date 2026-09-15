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

import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutFlakyTests } from '@kbn/scout-reporting';

import { DEFAULT_GITHUB_REPO, GithubApi } from '../failed_tests_reporter/github_api';
import { reportFlakySuiteIssues } from './reporter';

const DEFAULT_INPUT = 'target/flaky_tests/flaky_tests.json';
const DEFAULT_SUMMARY_PATH = 'target/flaky_tests/github_issues.json';
/**
 * A year covers the closed issues that could still be about a test in today's report; older ones
 * are mostly about tests since fixed, moved or removed, and fetching all of them would double the
 * requests.
 */
const DEFAULT_CLOSED_SINCE_DAYS = 365;
const DEFAULT_MAX_NEW_ISSUES = 10;
const DEFAULT_MIN_COMMENT_INTERVAL_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function runReportFlakyTestIssuesCli() {
  run(
    async ({ log, flagsReader }) => {
      const startedAt = performance.now();
      const inputPath = Path.resolve(REPO_ROOT, flagsReader.requiredString('input'));
      const summaryPath = Path.resolve(REPO_ROOT, flagsReader.requiredString('summary-path'));
      const dryRun = flagsReader.boolean('dry-run');
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw createFlagError('GITHUB_TOKEN must be set to read and write GitHub issues');
      }
      const githubRepo = flagsReader.requiredString('github-repo');
      if (!/^[\w.-]+\/[\w.-]+$/.test(githubRepo)) {
        throw createFlagError('--github-repo must be of the form owner/name');
      }
      const closedSinceDays = flagsReader.requiredNumber('closed-since-days');
      if (!Number.isInteger(closedSinceDays) || closedSinceDays < 1) {
        throw createFlagError('--closed-since-days must be a positive integer');
      }
      const maxNewIssues = flagsReader.requiredNumber('max-new-issues');
      if (!Number.isInteger(maxNewIssues) || maxNewIssues < 0) {
        throw createFlagError('--max-new-issues must be a non-negative integer');
      }
      const minCommentIntervalDays = flagsReader.requiredNumber('min-comment-interval-days');
      if (!(minCommentIntervalDays >= 0)) {
        throw createFlagError('--min-comment-interval-days must be a non-negative number');
      }
      const dashboardUrl = flagsReader.string('dashboard-url');
      const closedSince = new Date(Date.now() - closedSinceDays * MS_PER_DAY);

      log.info(`Reading flaky test report from ${inputPath}`);
      const { data: report } = ScoutFlakyTests.fromFile(inputPath);
      log.info(
        `${dryRun ? 'Dry run against' : 'Reporting to'} ${githubRepo}: open failed-test issues ` +
          `and those closed in the last ${closedSinceDays} days, at most ${maxNewIssues} new ` +
          `issues, one comment per issue per ${minCommentIntervalDays} days`
      );

      const summary = await reportFlakySuiteIssues({
        report,
        github: new GithubApi({ log, token, dryRun, repo: githubRepo }),
        log,
        githubRepo,
        closedSince,
        maxNewIssues,
        minCommentIntervalDays,
        dryRun,
        dashboardUrl,
      });

      Fs.mkdirSync(Path.dirname(summaryPath), { recursive: true });
      Fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      const { created, commented, reopened, skipped, failed } = summary.counts;
      log.info(
        `${summary.suites} flaky suites: ${created} issues created, ${commented} commented on, ` +
          `${reopened} reopened, ${skipped} skipped, ${failed} failed` +
          `${dryRun ? ' (dry run, nothing was written)' : ''} (summary in ${summaryPath})`
      );
      log.success(`Finished in ${((performance.now() - startedAt) / 1000).toFixed(2)}s`);
      if (failed > 0) {
        throw createFailError(`${failed} GitHub updates failed, see the log above`);
      }
    },
    {
      description: `
        File, comment on or reopen GitHub failed-test issues for the flaky test suites of a report
        written by \`node scripts/scout discover-flaky-tests\`: a suite without an issue gets one
        (worst suites first, up to --max-new-issues), a suite with an open issue, its own or one
        of its tests', gets a still-flaky comment at most every --min-comment-interval-days, a
        suite whose issue was closed but that kept failing gets it reopened. Lists every open
        failed-test issue and the recently closed ones, then matches locally.

        Examples:
          GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --dry-run
          GITHUB_TOKEN=... node scripts/report_flaky_test_issues --github-repo elastic/appex-qa-ai
      `,
      flags: {
        string: [
          'input',
          'summary-path',
          'github-repo',
          'closed-since-days',
          'max-new-issues',
          'min-comment-interval-days',
          'dashboard-url',
        ],
        boolean: ['dry-run'],
        default: {
          input: DEFAULT_INPUT,
          'summary-path': DEFAULT_SUMMARY_PATH,
          'github-repo': DEFAULT_GITHUB_REPO,
          'closed-since-days': String(DEFAULT_CLOSED_SINCE_DAYS),
          'max-new-issues': String(DEFAULT_MAX_NEW_ISSUES),
          'min-comment-interval-days': String(DEFAULT_MIN_COMMENT_INTERVAL_DAYS),
          'dry-run': false,
        },
        help: `
          --input                      Flaky test report to read [default: ${DEFAULT_INPUT}]
          --summary-path               Where to write the JSON summary [default: ${DEFAULT_SUMMARY_PATH}]
          --github-repo                owner/name of the repository whose issues are read and written [default: ${DEFAULT_GITHUB_REPO}]
          --closed-since-days          Only closed issues updated within this many days count as tracking a suite [default: ${DEFAULT_CLOSED_SINCE_DAYS}]
          --max-new-issues             Issues created per run, worst suites first [default: ${DEFAULT_MAX_NEW_ISSUES}]
          --min-comment-interval-days  Days between two report comments on the same issue [default: ${DEFAULT_MIN_COMMENT_INTERVAL_DAYS}]
          --dashboard-url              Dashboard with the live numbers, linked from new issues
          --dry-run                    Read issues and log what would be filed, commented on or reopened without writing
        `,
      },
    }
  );
}
