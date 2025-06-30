/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { execSync } from 'child_process';
import execa from 'execa';

run(
  async ({ log, flags }) => {
    const repoRoot = execSync('git rev-parse --show-toplevel').toString('utf-8').trim();
    const lsFiles = execa.sync('git', ['ls-files'], {
      cwd: repoRoot,
    });
    const bail = flags.bail || false;

    const files = lsFiles.stdout
      .toString('utf-8')
      .trim()
      .split('\n')
      .filter((file) => file.match(/\.(js|mjs|ts|tsx)$/));

    log.info(`Found ${files.length} files to lint.`);

    const batchSize = 250;
    const maxAsync = 8;

    const eslintPassalongOptions = flags.unexpected
      .concat([flags.cache ? null : '--no-cache'])
      .filter(Boolean);
    const args = ['scripts/eslint', ...eslintPassalongOptions];
    log.info(
      `Running ESLint with args: ${pretty({
        args,
        batchSize,
        maxAsync,
      })}`
    );
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    const results = await runBatchedPromises(
      batches.map((batch, idx) => () => {
        return new Promise(async (resolve, reject) => {
          try {
            const timeBefore = Date.now();
            log.info(`Running batch ${idx + 1}/${batches.length} with ${batch.length} files...`);
            const lintProcessResult = await execa('node', args.concat(batch), {
              cwd: repoRoot,
              env: {
                // Disable CI stats for individual runs, to avoid overloading ci-stats
                CI_STATS_DISABLED: 'true',
              },
              reject: bail, // Don't throw on non-zero exit code
            });
            const timeAfter = Date.now();
            const { stdout, stderr, exitCode } = lintProcessResult;
            if (exitCode !== 0) {
              const errorMessage = stderr?.toString() || stdout?.toString();
              log.error(`Batch ${idx + 1}/${batches.length} failed ❌: ${errorMessage}`);
              resolve({
                success: false,
                idx,
                time: timeAfter - timeBefore,
                error: stderr?.toString(),
              });
            } else {
              log.info(`Batch ${idx + 1}/${batches.length} success: ${stdout.toString()}`);
              resolve({
                success: true,
                idx,
                time: timeAfter - timeBefore,
              });
            }
          } catch (error) {
            reject(error);
          }
        });
      }),
      maxAsync
    );

    const failedBatches = results.filter((result) => !result.success);
    if (failedBatches.length > 0) {
      log.error(`Linting errors found ❌`);
      process.exit(1);
    } else {
      log.info('Linting successful ✅');
    }
  },
  {
    description: 'Run ESLint on all JavaScript/TypeScript files in the repository',
    flags: {
      boolean: ['bail', 'cache'],
      allowUnexpected: true,
      help: `
        --bail            Stop on the first linting error
        --no-cache        Disable ESLint caching
      `,
    },
  }
);

function runBatchedPromises(promiseCreators, max) {
  const results = [];
  let i = 0;

  const next = () => {
    if (i >= promiseCreators.length) {
      return Promise.resolve();
    }

    const promiseCreator = promiseCreators[i++];
    return Promise.resolve(promiseCreator()).then((result) => {
      results.push(result);
      return next();
    });
  };

  const tasks = Array.from({ length: max }, () => next());
  return Promise.all(tasks).then(() => results);
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}
