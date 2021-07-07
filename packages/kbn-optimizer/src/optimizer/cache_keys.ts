/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import Chalk from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/utils';
import stripAnsi from 'strip-ansi';

import jestDiff from 'jest-diff';
import jsonStable from 'json-stable-stringify';
import { ascending, CacheableWorkerConfig } from '../common';

import { getMtimes } from './get_mtimes';
import { getChanges } from './get_changes';
import { OptimizerConfig } from './optimizer_config';

const RELATIVE_DIR = 'packages/kbn-optimizer';

export function diffCacheKey(expected?: unknown, actual?: unknown) {
  const expectedJson = jsonStable(expected, {
    space: '  ',
  });
  const actualJson = jsonStable(actual, {
    space: '  ',
  });

  if (expectedJson === actualJson) {
    return;
  }

  return reformatJestDiff(jestDiff(expectedJson, actualJson));
}

export function reformatJestDiff(diff: string | null) {
  const diffLines = diff?.split('\n') || [];

  if (
    diffLines.length < 4 ||
    stripAnsi(diffLines[0]) !== '- Expected' ||
    stripAnsi(diffLines[1]) !== '+ Received'
  ) {
    throw new Error(`unexpected diff format: ${diff}`);
  }

  const outputLines = [diffLines.shift(), diffLines.shift(), diffLines.shift()];

  /**
   * buffer which contains between 0 and 5 lines from the diff which aren't additions or
   * deletions. The first three are the first three lines seen since the buffer was cleared
   * and the last two lines are the last two lines seen.
   *
   * When flushContext() is called we write the first two lines to output, an elipses if there
   * are five lines, and then the last two lines.
   *
   * At the very end we will write the last two lines of context if they're defined
   */
  const contextBuffer: string[] = [];

  /**
   * Convert a line to an empty line with elipses placed where the text on that line starts
   */
  const toElipses = (line: string) => {
    return stripAnsi(line).replace(/^(\s*).*/, '$1...');
  };

  while (diffLines.length) {
    const line = diffLines.shift()!;
    const plainLine = stripAnsi(line);
    if (plainLine.startsWith('+ ') || plainLine.startsWith('- ')) {
      // write contextBuffer to the outputLines
      if (contextBuffer.length) {
        outputLines.push(
          ...contextBuffer.slice(0, 2),
          ...(contextBuffer.length === 5
            ? [Chalk.dim(toElipses(contextBuffer[2])), ...contextBuffer.slice(3, 5)]
            : contextBuffer.slice(2, 4))
        );

        contextBuffer.length = 0;
      }

      // add this line to the outputLines
      outputLines.push(line);
    } else {
      // update the contextBuffer with this line which doesn't represent a change
      if (contextBuffer.length === 5) {
        contextBuffer[3] = contextBuffer[4];
        contextBuffer[4] = line;
      } else {
        contextBuffer.push(line);
      }
    }
  }

  if (contextBuffer.length) {
    outputLines.push(
      ...contextBuffer.slice(0, 2),
      ...(contextBuffer.length > 2 ? [Chalk.dim(toElipses(contextBuffer[2]))] : [])
    );
  }

  return outputLines.join('\n');
}

export interface OptimizerCacheKey {
  readonly lastCommit: string | undefined;
  readonly workerConfig: CacheableWorkerConfig;
  readonly deletedPaths: string[];
  readonly modifiedTimes: Record<string, number>;
}

async function getLastCommit() {
  const { stdout } = await execa(
    'git',
    ['log', '-n', '1', '--pretty=format:%H', '--', RELATIVE_DIR],
    {
      cwd: REPO_ROOT,
    }
  );

  return stdout.trim() || undefined;
}

export async function getOptimizerCacheKey(config: OptimizerConfig): Promise<OptimizerCacheKey> {
  if (!Fs.existsSync(Path.resolve(REPO_ROOT, '.git'))) {
    return {
      lastCommit: undefined,
      modifiedTimes: {},
      workerConfig: config.getCacheableWorkerConfig(),
      deletedPaths: [],
    };
  }

  const [changes, lastCommit] = await Promise.all([
    getChanges(RELATIVE_DIR),
    getLastCommit(),
  ] as const);

  const deletedPaths: string[] = [];
  const modifiedPaths: string[] = [];
  for (const [path, type] of changes) {
    (type === 'deleted' ? deletedPaths : modifiedPaths).push(path);
  }

  const cacheKeys: OptimizerCacheKey = {
    lastCommit,
    deletedPaths,
    modifiedTimes: {} as Record<string, number>,
    workerConfig: config.getCacheableWorkerConfig(),
  };

  const mtimes = await getMtimes(modifiedPaths);
  for (const [path, mtime] of Array.from(mtimes.entries()).sort(ascending((e) => e[0]))) {
    if (typeof mtime === 'number') {
      cacheKeys.modifiedTimes[path] = mtime;
    }
  }

  return cacheKeys;
}
