/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

run(
  async ({ log }) => {
    log.info('Running pre-push quick checks...');

    // Build the quick_checks command with --branch flag
    // The --branch flag handles all the git logic (finding remote, getting changed files)
    const args = ['scripts/quick_checks.js', '--branch'];

    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn('node', args, {
        cwd: REPO_ROOT,
        env: { ...process.env },
        stdio: 'inherit', // Stream output directly to terminal
      });

      child.on('close', (code) => {
        resolve(code ?? 1);
      });

      child.on('error', (error) => {
        log.error(`Failed to start quick checks: ${error.message}`);
        resolve(1);
      });
    });

    if (exitCode !== 0) {
      throw createFailError(
        'Pre-push checks failed. Please fix the issues above before pushing.\n' +
          'You can bypass this check with: git push --no-verify'
      );
    }

    log.success('Pre-push checks passed!');
  },
  {
    description:
      'Run quick checks on files changed in the current branch compared to upstream main',
    flags: {
      help: `
        This script is a thin wrapper around 'node scripts/quick_checks --branch'.
        It is invoked automatically by the git pre-push hook.

        To run manually:
          node scripts/prepush_hook

        To bypass when pushing:
          git push --no-verify
      `,
    },
  }
);
