/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fork } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import execa from 'execa';
import ignore from 'ignore';

// The parent only hands out chunks, so every core gets a worker.
const workerCount = Os.availableParallelism();
// Per-file cost varies a lot between directories, so workers pull small chunks from a shared
// queue instead of getting one fixed batch each.
const chunkSize = 500;

/** The reply `prettier_worker.js` sends for each chunk. */
interface ChunkResult {
  unformatted: string[];
  errors: string[];
}

const readIgnoreFile = (name: string) => Fs.readFileSync(Path.resolve(REPO_ROOT, name), 'utf8');

/**
 * The files the `prettier/prettier` ESLint rule checked: ESLint skips dotfiles, `node_modules`
 * and `.eslintignore`, and the rule skips `.prettierignore`.
 */
const getFiles = (paths: string[]) => {
  const ignored = ignore()
    .add(['.*', 'node_modules/'])
    .add(readIgnoreFile('.eslintignore'))
    .add(readIgnoreFile('.prettierignore'));
  return execa
    .sync('git', ['ls-files', '-z', '--', ...paths], { cwd: REPO_ROOT, encoding: 'utf8' })
    .stdout.split('\0')
    .filter((file) => /\.(js|mjs|ts|tsx)$/.test(file) && !ignored.ignores(file));
};

/** Checks (or, with `fix`, formats) `files` in a pool of workers pulling chunks from one queue. */
const runPrettierPool = async (files: string[], fix: boolean) => {
  const chunks: string[][] = [];
  for (let i = 0; i < files.length; i += chunkSize) {
    chunks.push(files.slice(i, i + chunkSize));
  }
  const result: ChunkResult = { unformatted: [], errors: [] };

  const runWorker = () => {
    const { promise, resolve } = Promise.withResolvers<void>();
    const worker = fork(require.resolve('./prettier_worker'), [JSON.stringify({ fix })], {
      cwd: REPO_ROOT,
    });
    const sendNextChunk = () => {
      const chunk = chunks.shift();
      if (chunk) {
        worker.send(chunk);
      } else {
        worker.disconnect();
      }
    };

    worker.on('message', ({ unformatted, errors }: ChunkResult) => {
      result.unformatted.push(...unformatted);
      result.errors.push(...errors);
      sendNextChunk();
    });
    worker.on('exit', (code, signal) => {
      if (code !== 0) {
        result.errors.push(`Prettier worker exited with ${signal ?? `code ${code}`}`);
      }
      resolve();
    });
    sendNextChunk();
    return promise;
  };

  await Promise.all(Array.from({ length: Math.min(workerCount, chunks.length) }, runWorker));
  return result;
};

run(
  async ({ log, flags }) => {
    const fix = !!flags.fix;
    const files = getFiles(flags._);
    log.info(`${fix ? 'Formatting' : 'Checking'} ${files.length} files`);

    const { unformatted, errors } = await runPrettierPool(files, fix);

    for (const error of errors) {
      log.error(error);
    }
    if (unformatted.length > 0) {
      const fileList = unformatted
        .sort()
        .map((file) => `  ${file}`)
        .join('\n');
      log.write(`${fix ? 'Formatted' : 'Not formatted'}:\n${fileList}`);
    }
    if (errors.length > 0) {
      throw createFailError('Prettier could not format some files ❌');
    }
    if (unformatted.length > 0 && !fix) {
      throw createFailError(
        'Prettier found unformatted files ❌ Fix them with `node scripts/prettier_all_files --fix`'
      );
    }
    log.success('Formatting is correct ✅');
  },
  {
    usage: 'node scripts/prettier_all_files [paths...] [--fix]',
    description:
      'Check that all JavaScript/TypeScript files tracked by git are formatted with Prettier',
    flags: {
      boolean: ['fix'],
      help: `
        --fix             Format files
      `,
    },
  }
);
