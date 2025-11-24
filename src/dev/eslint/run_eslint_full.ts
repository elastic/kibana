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

const IS_CI = !!process.env.CI;

run(
  async ({ log, flags }) => {
    const bail = !!(flags.bail || false);

    const eslintArgs = [...(flags.fix ? ['--fix'] : []), flags.cache ? '--cache' : '--no-cache'];
    const moonCommand = ['run', ':eslint'];
    if (IS_CI) {
      moonCommand.push('--affected', '--remote');
    }

    const fullArgs = [...moonCommand, '--', ...eslintArgs].concat(flags._);

    log.info(`Running ESLint: 'moon ${fullArgs.join(' ')}'`);

    const { exitCode } = await execa('moon', fullArgs, {
      cwd: REPO_ROOT,
      env: {
        // Disable CI stats for individual runs, to avoid overloading ci-stats
        CI_STATS_DISABLED: 'true',
        PATH: process.env.PATH + `:${path.join('node_modules', '.bin')}`,
        MOON_NO_ACTIONS: 'true',
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
      boolean: ['bail', 'cache', 'fix'],
      default: {
        bail: false,
        cache: true, // Enable caching by default
      },
      help: `
        --bail            Stop on the first linting error
        --no-cache        Disable ESLint caching
        --fix             Fix files
      `,
    },
  }
);
