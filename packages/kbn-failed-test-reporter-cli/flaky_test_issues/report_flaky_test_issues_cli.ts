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
import { reportFlakySuiteIssues, type IssueRepository } from './reporter';

const DEFAULT_INPUT = 'target/flaky_tests/flaky_tests.json';
const DEFAULT_SUMMARY_PATH = 'target/flaky_tests/github_issues.json';
/** The repository whose `failed-test` issues count as tracking a suite wherever issues are filed. */
const DEFAULT_TRACKING_REPO = DEFAULT_GITHUB_REPO;
/**
 * A year covers the closed issues that could still be about a test in today's report; older ones
 * are mostly about tests since fixed, moved or removed, and fetching all of them would double the
 * requests.
 */
const DEFAULT_CLOSED_SINCE_DAYS = 365;
const DEFAULT_MAX_NEW_ISSUES = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `owner/name`, as GitHub spells a repository. */
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

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
      if (!REPO_PATTERN.test(githubRepo)) {
        throw createFlagError('--github-repo must be of the form owner/name');
      }
      // Empty disables the check, e.g. to try the tool out against a sandbox on its own
      const trackingRepo = flagsReader.string('tracking-repo') ?? '';
      if (trackingRepo !== '' && !REPO_PATTERN.test(trackingRepo)) {
        throw createFlagError('--tracking-repo must be of the form owner/name, or empty');
      }
      const closedSinceDays = flagsReader.requiredNumber('closed-since-days');
      if (!Number.isInteger(closedSinceDays) || closedSinceDays < 1) {
        throw createFlagError('--closed-since-days must be a positive integer');
      }
      const maxNewIssues = flagsReader.requiredNumber('max-new-issues');
      if (!Number.isInteger(maxNewIssues) || maxNewIssues < 0) {
        throw createFlagError('--max-new-issues must be a non-negative integer');
      }
      const closedSince = new Date(Date.now() - closedSinceDays * MS_PER_DAY);

      log.info(`Reading flaky test report from ${inputPath}`);
      const { data: report } = ScoutFlakyTests.fromFile(inputPath);

      // The tracking repository is only ever read, so its client is a dry-run one: listings
      // still run, anything else would be logged rather than sent
      const tracking: IssueRepository | undefined =
        trackingRepo && trackingRepo !== githubRepo
          ? {
              github: new GithubApi({ log, token, dryRun: true, repo: trackingRepo }),
              repo: trackingRepo,
            }
          : undefined;
      log.info(
        `${dryRun ? 'Dry run against' : 'Filing issues in'} ${githubRepo}: open failed-test ` +
          `issues and those closed in the last ${closedSinceDays} days count as tracking a suite` +
          (tracking
            ? `, and a suite whose every test has one in ${tracking.repo} is skipped`
            : '') +
          `; at most ${maxNewIssues} new issues`
      );

      const summary = await reportFlakySuiteIssues({
        report,
        github: new GithubApi({ log, token, dryRun, repo: githubRepo }),
        log,
        githubRepo,
        tracking,
        closedSince,
        maxNewIssues,
        dryRun,
      });

      Fs.mkdirSync(Path.dirname(summaryPath), { recursive: true });
      Fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      const { created, skipped, failed } = summary.counts;
      log.info(
        `${summary.suites} flaky suites: ${created} issues created, ${skipped} skipped, ` +
          `${failed} failed${dryRun ? ' (dry run, nothing was written)' : ''} ` +
          `(summary in ${summaryPath})`
      );
      log.success(`Finished in ${((performance.now() - startedAt) / 1000).toFixed(2)}s`);
      if (failed > 0) {
        throw createFailError(`${failed} GitHub issues could not be created, see the log above`);
      }
    },
    {
      description: `
        File a GitHub failed-test issue for every flaky test suite of a report written by
        \`node scripts/scout discover-flaky-tests\` that no issue is about yet, worst suites first
        and up to --max-new-issues per run. Lists every open failed-test issue and the recently
        closed ones in --github-repo and in --tracking-repo, then matches locally. A suite gets no
        issue when every one of its tests has one in either repository, open or closed, a per-test
        issue about it or an issue about the suite or its file; a single test without one is
        enough for the suite issue to be filed.

        Examples:
          GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --dry-run
          GITHUB_TOKEN=... node scripts/report_flaky_test_issues --github-repo elastic/appex-qa-ai
      `,
      flags: {
        string: [
          'input',
          'summary-path',
          'github-repo',
          'tracking-repo',
          'closed-since-days',
          'max-new-issues',
        ],
        boolean: ['dry-run'],
        default: {
          input: DEFAULT_INPUT,
          'summary-path': DEFAULT_SUMMARY_PATH,
          'github-repo': DEFAULT_GITHUB_REPO,
          'tracking-repo': DEFAULT_TRACKING_REPO,
          'closed-since-days': String(DEFAULT_CLOSED_SINCE_DAYS),
          'max-new-issues': String(DEFAULT_MAX_NEW_ISSUES),
          'dry-run': false,
        },
        help: `
          --input               Flaky test report to read [default: ${DEFAULT_INPUT}]
          --summary-path        Where to write the JSON summary [default: ${DEFAULT_SUMMARY_PATH}]
          --github-repo         owner/name of the repository the issues are filed in [default: ${DEFAULT_GITHUB_REPO}]
          --tracking-repo       owner/name whose failed-test issues cover a suite once every one of its tests has one; never written to, empty disables [default: ${DEFAULT_TRACKING_REPO}]
          --closed-since-days   Only closed issues updated within this many days count as tracking a suite [default: ${DEFAULT_CLOSED_SINCE_DAYS}]
          --max-new-issues      Issues created per run, worst suites first [default: ${DEFAULT_MAX_NEW_ISSUES}]
          --dry-run             Read issues and log what would be filed without writing
        `,
      },
    }
  );
}
