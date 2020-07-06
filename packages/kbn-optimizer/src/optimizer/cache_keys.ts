/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';
import Fs from 'fs';
import { promisify } from 'util';

import Chalk from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/dev-utils';
import stripAnsi from 'strip-ansi';

import jestDiff from 'jest-diff';
import jsonStable from 'json-stable-stringify';
import { ascending, CacheableWorkerConfig } from '../common';

import { getMtimes } from './get_mtimes';
import { getChanges } from './get_changes';
import { OptimizerConfig } from './optimizer_config';

const OPTIMIZER_DIR = Path.dirname(require.resolve('../../package.json'));
const RELATIVE_DIR = Path.relative(REPO_ROOT, OPTIMIZER_DIR);

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
  readonly bootstrap: string | undefined;
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

async function getBootstrapCacheKey() {
  try {
    return await promisify(Fs.readFile)(
      Path.resolve(OPTIMIZER_DIR, 'target/.bootstrap-cache'),
      'utf8'
    );
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    return undefined;
  }
}

export async function getOptimizerCacheKey(config: OptimizerConfig) {
  const [changes, lastCommit, bootstrap] = await Promise.all([
    getChanges(OPTIMIZER_DIR),
    getLastCommit(),
    getBootstrapCacheKey(),
  ] as const);

  const deletedPaths: string[] = [];
  const modifiedPaths: string[] = [];
  for (const [path, type] of changes) {
    (type === 'deleted' ? deletedPaths : modifiedPaths).push(path);
  }

  const cacheKeys: OptimizerCacheKey = {
    lastCommit,
    bootstrap,
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
