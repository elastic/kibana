/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoadedBenchConfig } from './config/types';
import { fromModuleBenchmark } from './runner/from_module_benchmark';
import { fromScriptBenchmark } from './runner/from_script_benchmark';
import { openProfileInSpeedScope } from './runner/profile/open_profile_in_speedscope';
import { runBenchmark } from './runner/run_benchmark';
import type { BenchmarkResult, ConfigResult } from './runner/types';
import type { GlobalRunContext } from './types';

export async function runConfig({
  config,
  context,
}: {
  config: LoadedBenchConfig;
  context: GlobalRunContext;
}): Promise<ConfigResult> {
  const withRunnables = await Promise.all(
    config.benchmarks.map(async (benchmark) => {
      if (benchmark.kind === 'module') {
        return {
          benchmark,
          runnable: await fromModuleBenchmark(benchmark),
        };
      }
      return {
        benchmark,
        runnable: await fromScriptBenchmark(benchmark),
      };
    })
  );

  const results: BenchmarkResult[] = [];
  for (const { benchmark, runnable } of withRunnables) {
    const result = await runBenchmark({
      benchmark,
      runnable,
      config,
      context,
    });

    if (config.openProfile && result.profile) {
      await openProfileInSpeedScope(context.log, result.profile);
    }
    results.push(result);
  }

  return {
    benchmarks: results,
    config,
  };
}
