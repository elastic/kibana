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
import { requestFlakyTestFixes } from './selector';

export const runRequestFlakyTestFixesCli = (): void => {
  run(
    async ({ log, flagsReader }) => {
      const dryRun = flagsReader.boolean('dry-run');
      const repo = flagsReader.requiredString('github-repo');
      const maxRequests = flagsReader.requiredNumber('max-requests');
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        throw createFlagError('--github-repo must be owner/name');
      }
      if (!Number.isSafeInteger(maxRequests) || maxRequests < 0) {
        throw createFlagError('--max-requests must be a non-negative integer');
      }
      const token = process.env.GITHUB_TOKEN;
      if (!token) throw createFlagError('GITHUB_TOKEN is required, including for dry-run reads');
      if (
        !dryRun &&
        (repo !== DEFAULT_GITHUB_REPO ||
          process.env.BUILDKITE_PIPELINE_SLUG !== 'kibana-report-flaky-tests' ||
          process.env.BUILDKITE_STEP_KEY !== 'request-flaky-test-fixes')
      ) {
        throw createFlagError(
          'Live requests must run in the serialized report-flaky-tests selector step for elastic/kibana'
        );
      }
      const { data: report } = ScoutFlakyTests.fromFile(
        Path.resolve(REPO_ROOT, flagsReader.requiredString('input'))
      );
      const summary = await requestFlakyTestFixes({
        github: new GithubApi({ log, token, dryRun, repo }),
        report,
        repo,
        dryRun,
        maxRequests,
        buildUrl: process.env.BUILDKITE_BUILD_URL ?? 'local dry run',
        fileExists: (filePath) => Fs.existsSync(Path.resolve(REPO_ROOT, filePath)),
        log,
      });
      const summaryPath = Path.resolve(REPO_ROOT, flagsReader.requiredString('summary-path'));
      Fs.mkdirSync(Path.dirname(summaryPath), { recursive: true });
      Fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      if (summary.actions.some(({ action }) => action === 'failed')) {
        throw createFailError(
          `Some requests could not be confirmed; inspect ${summaryPath} before retrying`
        );
      }
      log.info(`Wrote automatic fix decisions to ${summaryPath}`);
    },
    {
      description:
        'Select one automatic AI fix per active flaky test file and representative open episode',
      flags: {
        boolean: ['dry-run'],
        string: ['input', 'summary-path', 'github-repo', 'max-requests'],
        default: {
          'dry-run': true,
          input: 'target/flaky_tests/flaky_tests.json',
          'summary-path': 'target/flaky_tests/ai_fixes.json',
          'github-repo': DEFAULT_GITHUB_REPO,
          'max-requests': '5',
        },
        help: `
          --input           Flaky report JSON [default: target/flaky_tests/flaky_tests.json]
          --summary-path    Decision artifact [default: target/flaky_tests/ai_fixes.json]
          --github-repo     Repository to inspect [default: elastic/kibana]
          --max-requests    Automatic requests per run [default: 5]
          --dry-run         Read real issues/history without writing (default)
          --no-dry-run      Request fixes; only allowed in the serialized production step
        `,
      },
    }
  );
};
