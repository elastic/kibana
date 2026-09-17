/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Configuration } from '@rspack/core';
import {
  createSingleCompileConfig,
  type SingleCompileConfigOptions,
} from './create_single_compile_config';
import { createMonacoWorkersConfig, MONACO_WORKERS_COMPILER } from './create_monaco_workers_config';
import { createSharedNpmConfig } from './create_shared_npm_config';
import { createSharedSrcConfig, SHARED_SRC_COMPILER } from './create_shared_src_config';
import { resolveSharedAssetPaths } from './shared_asset_paths';

export const KIBANA_COMPILER = 'kibana';

export async function createMultiCompileConfig(
  options: SingleCompileConfigOptions
): Promise<Configuration[]> {
  const sharedConfigs = createSharedCompileConfigs(options);
  const { npmManifest } = resolveSharedAssetPaths(
    options.repoRoot,
    options.outputRoot ?? options.repoRoot
  );
  const kibanaConfig = await createSingleCompileConfig({
    ...options,
    dllManifestPath: npmManifest,
  });

  return [
    ...sharedConfigs,
    {
      ...kibanaConfig,
      name: KIBANA_COMPILER,
      dependencies: [SHARED_SRC_COMPILER, MONACO_WORKERS_COMPILER],
    },
  ];
}

export function createSharedCompileConfigs({
  repoRoot,
  outputRoot = repoRoot,
  dist = false,
}: Pick<SingleCompileConfigOptions, 'repoRoot' | 'outputRoot' | 'dist'>): Configuration[] {
  return [
    createSharedNpmConfig({ repoRoot, outputRoot, dist }),
    createMonacoWorkersConfig({ repoRoot, outputRoot, dist }),
    createSharedSrcConfig({ repoRoot, outputRoot, dist }),
  ];
}
