/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import execa from 'execa';
import { REPO_ROOT } from '@kbn/utils';
import { diffStrings } from '@kbn/dev-utils';

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

  return diffStrings(expectedJson, actualJson);
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
