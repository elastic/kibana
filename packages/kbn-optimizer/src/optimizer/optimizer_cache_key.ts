/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readHashOfPackageMap } from '@kbn/synthetic-package-map';

import { CacheableWorkerConfig, Hashes } from '../common';
import { OptimizerConfig } from './optimizer_config';
import { getOptimizerBuiltPaths } from './optimizer_built_paths';

export interface OptimizerCacheKey {
  readonly workerConfig: CacheableWorkerConfig;
  readonly checksums: Record<string, string>;
  readonly synthPackages: string;
}

/**
 * Hash the contents of the built files that the optimizer is currently running. This allows us to
 * invalidate the optimizer results if someone forgets to bootstrap, or changes the optimizer source files
 */
export async function getOptimizerCacheKey(config: OptimizerConfig): Promise<OptimizerCacheKey> {
  const hashes = await Hashes.ofFiles(await getOptimizerBuiltPaths());

  return {
    checksums: hashes.cacheToJson(),
    workerConfig: config.getCacheableWorkerConfig(),
    synthPackages: readHashOfPackageMap(),
  };
}
