/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fork } from 'child_process';
import Os from 'os';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import execa from 'execa';

// The parent only hands out chunks, so every core gets a worker.
const workerCount = Os.availableParallelism();
// Per-file cost varies a lot between directories, so workers pull small chunks from a shared
// queue instead of getting one fixed batch each; chunks stay contiguous to keep caches warm.
const chunkSize = 500;

/** The reply `eslint_worker.js` sends for each chunk. */
interface ChunkResult {
  errorCount: number;
  output: string;
}

run(
  async ({ log, flags }) => {
    const bail = !!flags.bail;
    const workerOptions = { fix: !!flags.fix, cache: !!flags.cache };

    const files = execa
      .sync('git', ['ls-files', ...flags._], { cwd: REPO_ROOT, encoding: 'utf8' })
      .stdout.trim()
      .split('\n')
      .filter((file) => file.match(/\.(js|mjs|ts|tsx)$/));
    const chunks: string[][] = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }
    const poolSize = Math.min(workerCount, chunks.length);
    log.info(
      `Linting ${files.length} files in ${chunks.length} chunks with ${poolSize} workers`,
      workerOptions
    );

    let errorCount = 0;
    const workerFailures: string[] = [];
    const runWorker = () =>
      new Promise<void>((resolve) => {
        const worker = fork(require.resolve('./eslint_worker'), [JSON.stringify(workerOptions)], {
          cwd: REPO_ROOT,
          // Disable CI stats for the workers, to avoid overloading ci-stats
          env: { ...process.env, CI_STATS_DISABLED: 'true' },
        });
        const sendNextChunk = () => {
          // After a worker fails, the others finish (and write fixes for) their current chunk, then stop.
          const stop = workerFailures.length > 0 || (bail && errorCount > 0);
          const chunk = stop ? undefined : chunks.shift();
          if (chunk) {
            worker.send(chunk);
          } else {
            worker.disconnect();
          }
        };

        worker.on('message', (result: ChunkResult) => {
          errorCount += result.errorCount;
          if (result.output) {
            process.stdout.write(result.output);
          }
          sendNextChunk();
        });
        worker.on('exit', (code, signal) => {
          if (code !== 0) {
            workerFailures.push(`ESLint worker exited with ${signal ?? `code ${code}`}`);
          }
          resolve();
        });
        sendNextChunk();
      });

    await Promise.all(Array.from({ length: poolSize }, runWorker));

    if (workerFailures.length > 0) {
      throw createFailError(workerFailures.join('\n'));
    }

    if (errorCount > 0) {
      throw createFailError('Linting errors found ❌');
    }
    log.success('Linting successful ✅');
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
