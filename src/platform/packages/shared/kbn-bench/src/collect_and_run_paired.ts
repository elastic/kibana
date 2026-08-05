/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import { collectConfigPaths } from './config/collect_config_paths';
import { loadConfigs } from './config/load_configs';
import { parseConfigs } from './config/parse_configs';
import type { ConfigResult } from './runner/types';
import { runPairedConfig } from './run_paired_config';
import type { GlobalRunContext } from './types';

export async function hasPairedComparisonConfig({
  context,
  configGlob,
  configFromCwd,
}: {
  context: GlobalRunContext;
  configGlob?: string | string[];
  configFromCwd?: boolean;
}): Promise<boolean> {
  const configPaths = await collectConfigPaths({
    patterns: castArray(configGlob ?? []),
    cwd: configFromCwd ? process.cwd() : context.workspace.getDir(),
  });
  const parsedConfigs = await parseConfigs(configPaths);
  const configs = loadConfigs(parsedConfigs, context.globalConfig, context.runtimeOverrides);
  return configs.some((config) => config.comparisonRun !== undefined);
}

export async function collectAndRunPaired({
  leftContext,
  rightContext,
  configGlob,
  configFromCwd,
}: {
  leftContext: GlobalRunContext;
  rightContext: GlobalRunContext;
  configGlob?: string | string[];
  configFromCwd?: boolean;
}): Promise<{ leftResults: ConfigResult[]; rightResults: ConfigResult[] }> {
  const patterns = castArray(configGlob ?? []);
  const configPaths = await collectConfigPaths({
    patterns,
    cwd: configFromCwd ? process.cwd() : leftContext.workspace.getDir(),
  });
  const parsedConfigs = await parseConfigs(configPaths);
  const configs = loadConfigs(
    parsedConfigs,
    leftContext.globalConfig,
    leftContext.runtimeOverrides
  ).map((config) => ({
    ...config,
    benchmarks: config.benchmarks.filter((benchmark) => !benchmark.skip),
  }));

  if (!configs.length || configs.some((config) => !config.comparisonRun)) {
    throw new Error(
      'Randomized paired execution requires every selected config to set comparisonRun'
    );
  }

  const leftResults: ConfigResult[] = [];
  const rightResults: ConfigResult[] = [];
  for (const config of configs) {
    const baselineIdentity = leftContext.buildDir ?? (await leftContext.workspace.getCommitLine());
    const targetIdentity = rightContext.buildDir ?? (await rightContext.workspace.getCommitLine());
    const seed =
      process.env.KIBANA_CI_WARM_START_MEMORY_SEED ??
      config.comparisonRun!.seed ??
      `${baselineIdentity}|${targetIdentity}`;
    const result = await runPairedConfig({
      config,
      leftContext,
      rightContext,
      seed,
      baselineIdentity,
      targetIdentity,
    });
    leftResults.push(result.left);
    rightResults.push(result.right);
  }

  return { leftResults, rightResults };
}
