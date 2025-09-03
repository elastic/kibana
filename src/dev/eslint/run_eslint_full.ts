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
import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

const batchSize = 250;
const maxParallelism = 8;

run(
  async ({ log, flags }) => {
    const bail = !!(flags.bail || false);

    const { batches, files } = getLintableFileBatches();
    log.info(`Found ${files.length} files in ${batches.length} batches to lint.`);

    const eslintArgs =
      // Unexpected will contain anything meant for ESLint directly, like `--fix`
      flags.unexpected
        // ESLint has no cache by default
        .concat([flags.cache ? '--cache' : '--no-cache']);
    log.info(
      `Running ESLint with args: ${pretty({
        args: eslintArgs,
        batchSize,
        maxParallelism,
      })}`
    );

    const lintPromiseThunks = batches.map(
      (batch, idx) => () =>
        lintFileBatch({ batch, idx, eslintArgs, batchCount: batches.length, bail, log })
    );
    const results = await runBatchedPromises(lintPromiseThunks, maxParallelism);

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
      default: {
        bail: false,
        cache: true, // Enable caching by default
      },
      allowUnexpected: true,
      help: `
        --bail            Stop on the first linting error
        --no-cache        Disable ESLint caching
      `,
    },
  }
);

function getLintableFileBatches() {
  const files = execa
    .sync('git', ['ls-files'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
    .stdout.trim()
    .split('\n')
    .filter((file) => file.match(/\.(js|mjs|ts|tsx)$/));
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  return { batches, files };
}

async function lintFileBatch({
  batch,
  bail,
  idx,
  eslintArgs,
  batchCount,
  log,
}: {
  batch: string[];
  bail: boolean;
  idx: number;
  eslintArgs: string[];
  batchCount: number;
  log: ToolingLog;
}) {
  log.info(`Running batch ${idx + 1}/${batchCount} with ${batch.length} files...`);

  const timeBefore = Date.now();
  const args = ['scripts/eslint'].concat(eslintArgs).concat(batch);
  const { stdout, stderr, exitCode } = await execa('node', args, {
    cwd: REPO_ROOT,
    env: {
      // Disable CI stats for individual runs, to avoid overloading ci-stats
      CI_STATS_DISABLED: 'true',
    },
    reject: bail, // Don't throw on non-zero exit code
  });

  const time = Date.now() - timeBefore;
  if (exitCode !== 0) {
    const errorMessage = stderr?.toString() || stdout?.toString();
    log.error(`Batch ${idx + 1}/${batchCount} failed (${time}ms) ❌: ${errorMessage}`);
    return {
      success: false,
      idx,
      time,
      error: errorMessage,
    };
  } else {
    log.info(`Batch ${idx + 1}/${batchCount} success (${time}ms) ✅: ${stdout.toString()}`);
    return {
      success: true,
      idx,
      time,
    };
  }
}

function runBatchedPromises<T>(
  promiseCreators: Array<() => Promise<T>>,
  maxParallel: number
): Promise<T[]> {
  const results: T[] = [];
  let i = 0;

  const next: () => Promise<any> = () => {
    if (i >= promiseCreators.length) {
      return Promise.resolve();
    }

    const promiseCreator = promiseCreators[i++];
    return Promise.resolve(promiseCreator()).then((result) => {
      results.push(result);
      return next();
    });
  };

  const tasks = Array.from({ length: maxParallel }, () => next());
  return Promise.all(tasks).then(() => results);
}

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}
