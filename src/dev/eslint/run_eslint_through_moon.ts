/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import execa from 'execa';
import path from 'path';
import os from 'os';

const IS_CI = !!process.env.CI;

run(
  async ({ log, flags }) => {
    const bail = !!(flags.bail || false);

    const moonCommand = IS_CI ? 'ci' : 'run';
    const lintCommand = flags.fix ? ':eslint-fix' : ':eslint';
    const cacheFlag = IS_CI ? [] : flags.updateCache ? ['-u'] : [];

    const fullArgs = [moonCommand, lintCommand, ...cacheFlag];

    log.info(`Running ESLint: 'moon ${fullArgs.join(' ')}'`);

    const { exitCode } = await execa('moon', fullArgs, {
      cwd: REPO_ROOT,
      env: {
        // Disable CI stats for individual runs, to avoid overloading ci-stats
        CI_STATS_DISABLED: 'true',
        PATH: process.env.PATH + `:${path.join('node_modules', '.bin')}`,
        MOON_NO_ACTIONS: 'true',
        MOON_CONCURRENCY: '' + (os.availableParallelism() - 1),
      },
      stdio: 'inherit',
      reject: bail, // Don't throw on non-zero exit code
    });

    if (exitCode > 0) {
      log.error(`Linting errors found ❌`);
      process.exit(exitCode);
    } else {
      log.info('Linting successful ✅');
    }
  },
  {
    description: 'Run ESLint on all JavaScript/TypeScript files in the repository',
    flags: {
      boolean: ['bail', 'update-cache', 'fix'],
      default: {
        bail: false,
        updateCache: false,
      },
      help: `
        --bail            Stop on the first linting error
        --update-cache    Updates Moon's caches for the lint targets
        --fix             Fix files
      `,
    },
  }
);
