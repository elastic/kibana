/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateProcStats } from './report/aggregate_proc_stats';
import type {
  Benchmark,
  LoadedBenchConfig,
  PairedBenchmarkComparison,
  PairedComparisonPair,
  PairedComparisonResult,
  PairedComparisonStart,
} from './config/types';
import { fromModuleBenchmark } from './runner/from_module_benchmark';
import { fromScriptBenchmark } from './runner/from_script_benchmark';
import { createBenchmarkExecutor } from './runner/run_benchmark';
import type { BenchmarkResult, ConfigResult } from './runner/types';
import type { GlobalRunContext } from './types';

const REQUIRED_METRICS = ['tailHeapUsed', 'tailRss', 'rssMax'] as const;

type Side = 'baseline' | 'target';
type PairOrder = 'baseline-target' | 'target-baseline';

// Deterministic AB/BA alternation balances within-pair order across the run,
// which is what controls order bias in the paired delta; the mean of paired
// deltas does not model autocorrelation, so shuffling buys nothing over this.
export const createPairedOrder = ({ pairs }: { pairs: number }): PairOrder[] =>
  Array.from({ length: pairs }, (_, index) =>
    index % 2 === 0 ? 'baseline-target' : 'target-baseline'
  );

const isValidStart = (start: PairedComparisonStart): boolean => {
  if (start.result.status !== 'completed' || start.result.stats.length === 0) {
    return false;
  }

  const metrics = aggregateProcStats(start.result.stats);
  return REQUIRED_METRICS.every((metric) => Number.isFinite(metrics[metric]));
};

const toStart = async ({
  executor,
  side,
  attempt,
  pair,
  orderPosition,
}: {
  executor: ReturnType<typeof createBenchmarkExecutor>;
  side: Side;
  attempt: number;
  pair?: number;
  orderPosition: 0 | 1;
}): Promise<PairedComparisonStart> => ({
  attempt,
  pair,
  side,
  orderPosition,
  result: await executor.run(),
});

const createRunnable = async (benchmark: Benchmark) =>
  benchmark.kind === 'module' ? fromModuleBenchmark(benchmark) : fromScriptBenchmark(benchmark);

export async function runPairedConfig({
  config,
  leftContext,
  rightContext,
  baselineIdentity,
  targetIdentity,
}: {
  config: LoadedBenchConfig;
  leftContext: GlobalRunContext;
  rightContext: GlobalRunContext;
  baselineIdentity: string;
  targetIdentity: string;
}): Promise<{ left: ConfigResult; right: ConfigResult; pairedComparison: PairedComparisonResult }> {
  if (!config.comparisonRun || config.comparisonRun.mode !== 'paired') {
    throw new Error(`Config ${config.name} does not request paired comparison`);
  }
  if (config.profile) {
    throw new Error('Paired comparison does not support CPU profiling');
  }

  const leftBenchmarks: BenchmarkResult[] = [];
  const rightBenchmarks: BenchmarkResult[] = [];
  const pairedBenchmarks: PairedBenchmarkComparison[] = [];
  const { pairs, maxAttempts } = config.comparisonRun;
  const order = createPairedOrder({ pairs: maxAttempts });

  for (const benchmark of config.benchmarks) {
    const [leftRunnable, rightRunnable] = await Promise.all([
      createRunnable(benchmark),
      createRunnable(benchmark),
    ]);
    const leftExecutor = createBenchmarkExecutor({
      context: leftContext,
      config,
      benchmark,
      runnable: leftRunnable,
    });
    const rightExecutor = createBenchmarkExecutor({
      context: rightContext,
      config,
      benchmark,
      runnable: rightRunnable,
    });
    const starts: PairedComparisonStart[] = [];
    const validPairs: PairedComparisonPair[] = [];
    const leftRuns = [] as BenchmarkResult['runs'];
    const rightRuns = [] as BenchmarkResult['runs'];

    try {
      await leftExecutor.beforeAll();
      await rightExecutor.beforeAll();

      for (let attempt = 0; attempt < maxAttempts && validPairs.length < pairs; attempt++) {
        const pairOrder = order[attempt];
        const firstSide: Side = pairOrder === 'baseline-target' ? 'baseline' : 'target';
        const secondSide: Side = firstSide === 'baseline' ? 'target' : 'baseline';
        const executorFor = (side: Side) => (side === 'baseline' ? leftExecutor : rightExecutor);
        const first = await toStart({
          executor: executorFor(firstSide),
          side: firstSide,
          attempt,
          orderPosition: 0,
        });
        const second = await toStart({
          executor: executorFor(secondSide),
          side: secondSide,
          attempt,
          orderPosition: 1,
        });
        starts.push(first, second);

        const baseline = firstSide === 'baseline' ? first : second;
        const target = firstSide === 'target' ? first : second;
        if (!isValidStart(baseline) || !isValidStart(target)) {
          continue;
        }

        const pair = validPairs.length;
        const pairedBaseline = { ...baseline, pair };
        const pairedTarget = { ...target, pair };
        starts.splice(starts.indexOf(baseline), 1, pairedBaseline);
        starts.splice(starts.indexOf(target), 1, pairedTarget);
        validPairs.push({ pair, baseline: pairedBaseline, target: pairedTarget });
        leftRuns.push(pairedBaseline.result);
        rightRuns.push(pairedTarget.result);
      }
    } finally {
      await Promise.all([leftExecutor.afterAll(), rightExecutor.afterAll()]);
    }

    leftBenchmarks.push({ benchmark, runs: leftRuns });
    rightBenchmarks.push({ benchmark, runs: rightRuns });
    pairedBenchmarks.push({
      benchmarkName: benchmark.name,
      requestedPairs: pairs,
      attemptedPairs: starts.length / 2,
      validPairs,
      starts,
      order,
    });
  }

  const pairedComparison: PairedComparisonResult = {
    mode: 'paired',
    baselineIdentity,
    targetIdentity,
    benchmarks: pairedBenchmarks,
  };
  const left: ConfigResult = { config, benchmarks: leftBenchmarks, pairedComparison };
  const right: ConfigResult = { config, benchmarks: rightBenchmarks, pairedComparison };
  return { left, right, pairedComparison };
}
