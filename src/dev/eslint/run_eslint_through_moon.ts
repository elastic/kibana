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

const options = {
  description: 'Run ESLint on all Moon projects in the repository.',
  flags: {
    boolean: ['update-cache', 'fix', 'affected'],
    default: {
      updateCache: false,
      affected: false,
      fix: false,
    },
    help: `
        --update-cache    Update Moon's caches locally, ignores cache in CI
        --affected        Only run ESLint on affected projects (default on CI)
        --fix             Fix files
      `,
  },
};

const env = {
  CI_STATS_DISABLED: 'true',
  PATH: process.env.PATH + `:${path.join('node_modules', '.bin')}`,
  MOON_NO_ACTIONS: 'true',
  MOON_CONCURRENCY: '' + (os.availableParallelism() - 1),
  MOON_NO_BAIL: 'true',
} as Record<string, string>;

run(async ({ log, flags }) => {
  const fullArgs = ['run', flags.fix ? ':eslint-fix' : ':eslint'];

  if (flags.updateCache) {
    fullArgs.push('-u');
  }

  if (flags.affected) {
    fullArgs.push('--affected');
    if (!IS_CI) {
      fullArgs.push('--remote');
    }
  }

  log.info(`Running ESLint: 'moon ${fullArgs.join(' ')}'`);

  const { exitCode } = await execa('moon', fullArgs, {
    cwd: REPO_ROOT,
    env,
    stdio: 'inherit',
    reject: false,
  });

  if (exitCode > 0) {
    log.error(`Linting errors found ❌`);
    process.exit(exitCode);
  } else {
    log.info('Linting successful ✅');
  }
}, options);
