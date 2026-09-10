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
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutFlakyTests } from '@kbn/scout-reporting';

import { DEFAULT_GITHUB_REPO, GithubApi } from '../failed_tests_reporter/github_api';
import { checkFlakySuiteIssues } from './checker';

const DEFAULT_INPUT = 'target/flaky_tests/flaky_tests.json';
const DEFAULT_SUMMARY_PATH = 'target/flaky_tests/github_issues.json';

export function runCheckFlakyTestIssuesCli() {
  run(
    async ({ log, flagsReader }) => {
      const startedAt = performance.now();
      const inputPath = Path.resolve(REPO_ROOT, flagsReader.requiredString('input'));
      const summaryPath = Path.resolve(REPO_ROOT, flagsReader.requiredString('summary-path'));
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw createFlagError('GITHUB_TOKEN must be set to search GitHub issues');
      }
      const repo = flagsReader.requiredString('github-repo');
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        throw createFlagError('--github-repo must be of the form owner/name');
      }

      log.info(`Reading flaky test report from ${inputPath}`);
      const { data: report } = ScoutFlakyTests.fromFile(inputPath);
      log.info(`Checking open issues in ${repo}`);

      const summary = await checkFlakySuiteIssues({
        report,
        github: new GithubApi({ log, token, dryRun: false, repo }),
        log,
      });

      Fs.mkdirSync(Path.dirname(summaryPath), { recursive: true });
      Fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      const { tracked, related, untracked } = summary.counts;
      log.info(
        `${summary.suites} flaky suites: ${tracked} tracked by a suite issue, ` +
          `${related} with related failed-test issues, ${untracked} without any open issue ` +
          `(summary in ${summaryPath})`
      );
      log.success(`Finished in ${((performance.now() - startedAt) / 1000).toFixed(2)}s`);
    },
    {
      description: `
        Tell, for every flaky test suite in a report written by
        \`node scripts/scout discover-flaky-tests\`, whether an open GitHub issue already tracks it:
        a suite issue, per-test failed-test issues, or nothing. Read-only: nothing is filed or edited.

        Examples:
          GITHUB_TOKEN=... node scripts/check_flaky_test_issues --input .scout/flaky_tests.json
      `,
      flags: {
        string: ['input', 'summary-path', 'github-repo'],
        default: {
          input: DEFAULT_INPUT,
          'summary-path': DEFAULT_SUMMARY_PATH,
          'github-repo': DEFAULT_GITHUB_REPO,
        },
        help: `
          --input               Flaky test report to read [default: ${DEFAULT_INPUT}]
          --summary-path        Where to write the JSON summary [default: ${DEFAULT_SUMMARY_PATH}]
          --github-repo         owner/name of the repository whose issues are searched [default: ${DEFAULT_GITHUB_REPO}]
        `,
      },
    }
  );
}
