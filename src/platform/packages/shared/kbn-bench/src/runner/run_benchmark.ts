/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Benchmark, LoadedBenchConfig } from '../config/types';
import { getFileBaseDir } from '../filesystem/get_file_base_dir';
import type { GlobalRunContext } from '../types';
import { clearExistingProfiles } from './profile/clear_existing_profiles';
import { collectAndMergeCpuProfiles } from './profile/collect_and_merge_profiles';
import type {
  BenchmarkResult,
  BenchmarkRunContext,
  BenchmarkRunResult,
  BenchmarkRunReturn,
  BenchmarkRunnable,
} from './types';
import { wrapInProfiler } from './profile/wrap_in_profiler';
import { startMonitoring, type MonitoringResult } from './monitor/start_monitoring';

function createCallbackWrapper(
  context: BenchmarkRunContext,
  timeout: number
): <T extends ((ctx: BenchmarkRunContext) => Promise<any>) | undefined>(
  name: string,
  cb?: T
) => Promise<T extends Function ? Awaited<ReturnType<T>> : void> {
  return (name, cb) => {
    if (!cb) {
      return Promise.resolve();
    }

    context.log.debug(`Starting ${name}`);

    return Promise.race([
      Promise.resolve(cb(context))
        .then((val) => {
          context.log.debug(`Completed ${name}`);
          return val;
        })
        .catch((error) => {
          context.log.warning(`${name} failed with ${error}`);
          throw error;
        }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(`Timeout ${name}: timeout of ${timeout}ms reached before promise resolved`)
          );
        }, timeout).unref();
      }),
    ]);
  };
}

export interface BenchmarkExecutor {
  beforeAll: () => Promise<void>;
  run: () => Promise<BenchmarkRunResult>;
  afterAll: () => Promise<void>;
  readonly profilesDir: string;
}

/**
 * Creates an executor whose lifecycle can be interleaved with another executor.
 * `beforeAll` and `afterAll` intentionally remain explicit so comparison callers
 * can retain one warm-up/service lifetime per artifact while alternating starts.
 */
export function createBenchmarkExecutor({
  context,
  config,
  benchmark,
  runnable,
}: {
  context: GlobalRunContext;
  config: LoadedBenchConfig;
  benchmark: Benchmark;
  runnable: BenchmarkRunnable;
}): BenchmarkExecutor {
  const { log: parentLog, workspace } = context;
  const benchmarkContext: BenchmarkRunContext = {
    log: context.log,
    workspace,
    buildDir: context.buildDir,
  };
  const wrapInTimeout = createCallbackWrapper(benchmarkContext, config.timeout);
  const profilesDir = getFileBaseDir({
    dataDir: context.dataDir,
    configName: config.name,
    benchmarkName: benchmark.name,
    workspaceName: workspace.getDisplayName(),
  });
  const shouldMonitor = benchmark.kind !== 'module' || config.runs <= 100;

  const run = async (): Promise<BenchmarkRunResult> => {
    const stopMonitoring = shouldMonitor
      ? await startMonitoring({
          log: context.log,
          dir: profilesDir,
          procStatsRefreshInterval: config.monitorInterval,
        })
      : async () => ({ stats: [], samples: [] });
    let monitoring: MonitoringResult | undefined;

    try {
      await wrapInTimeout(`${benchmark.name}:before()`, runnable.before);
      const start = performance.now();
      const result: BenchmarkRunReturn | void = await wrapInTimeout(
        `${benchmark.name}:run()`,
        runnable.run
      );
      monitoring = await stopMonitoring({
        collectForcedGcHeapStats: runnable.monitoring?.collectForcedGcHeapStatsOnStop,
      });
      const shouldCollectForcedGc = runnable.monitoring?.collectForcedGcHeapStatsOnStop === true;
      const forcedGcErrors = monitoring.forcedGcHeapStats?.flatMap(({ pid, error }) =>
        error ? [`PID ${pid}: ${error.message}`] : []
      );
      if (shouldCollectForcedGc && !monitoring.forcedGcHeapStats?.length) {
        throw new Error('Forced-GC heap collection failed: monitor returned no process results');
      }
      if (forcedGcErrors?.length) {
        throw new Error(`Forced-GC heap collection failed: ${forcedGcErrors.join('; ')}`);
      }
      return {
        metrics: result?.metrics ?? {},
        status: 'completed',
        time: performance.now() - start,
        stats: monitoring.stats,
        samples: monitoring.samples,
        forcedGcHeapStats: monitoring.forcedGcHeapStats,
      };
    } catch (error) {
      monitoring ??= await stopMonitoring();
      return {
        error: error instanceof Error ? error : new Error(String(error)),
        status: 'failed',
        stats: monitoring.stats,
        samples: monitoring.samples,
        forcedGcHeapStats: monitoring.forcedGcHeapStats,
      };
    } finally {
      await wrapInTimeout(`${benchmark.name}:after()`, runnable.after);
    }
  };

  return {
    beforeAll: async () => {
      parentLog.info(
        `Start benchmark name=${benchmark.name} kind=${benchmark.kind} runs=${config.runs}`
      );
      await clearExistingProfiles(context.log, profilesDir);
      await wrapInTimeout(`${benchmark.name}:beforeAll()`, runnable.beforeAll);
    },
    run,
    afterAll: async () => {
      await wrapInTimeout(`${benchmark.name}:afterAll()`, runnable.afterAll);
    },
    profilesDir,
  };
}

export async function runBenchmark({
  context,
  config,
  benchmark,
  runnable,
}: {
  context: GlobalRunContext;
  config: LoadedBenchConfig;
  benchmark: Benchmark;
  runnable: BenchmarkRunnable;
}): Promise<BenchmarkResult> {
  const executor = createBenchmarkExecutor({ context, config, benchmark, runnable });
  const results: BenchmarkRunResult[] = [];

  try {
    await executor.beforeAll();
    const runAll = async () => {
      for (let i = 0; i < config.runs; i++) {
        results.push(await executor.run());
      }
    };

    if (config.profile) {
      await wrapInProfiler(executor.profilesDir, runAll);
    } else {
      await runAll();
    }
  } finally {
    await executor.afterAll();
  }

  let profile;
  if (config.profile) {
    profile = await collectAndMergeCpuProfiles({
      profilesDir: executor.profilesDir,
      name: benchmark.name,
      log: context.log,
    });
  }

  return { benchmark, runs: results, profile };
}
