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

// Matches Java's String.hashCode multiplier; this is only a stable,
// non-cryptographic conversion of the caller-provided seed string to an integer.
// Reference: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#hashCode()
const SEED_HASH_MULTIPLIER = 31;

// Parameters for a Lehmer pseudo-random number generator.
// Reference: https://en.wikipedia.org/wiki/Lehmer_random_number_generator#Parameters_in_common_use
const LEHMER_MODULUS = 2_147_483_647;
const LEHMER_MULTIPLIER = 48_271;

const toSeed = (seed: string): number => {
  let value = 0;
  for (const char of seed) {
    value = (value * SEED_HASH_MULTIPLIER + char.charCodeAt(0)) % LEHMER_MODULUS;
  }
  return value || 1;
};

const createPrng = (seed: string): (() => number) => {
  let state = toSeed(seed);
  return () => {
    state = (state * LEHMER_MULTIPLIER) % LEHMER_MODULUS;
    return state / LEHMER_MODULUS;
  };
};

export const createPairedOrder = ({
  pairs,
  seed,
}: {
  pairs: number;
  seed: string;
}): PairOrder[] => {
  const order: PairOrder[] = Array.from({ length: pairs }, (_, index) =>
    index % 2 === 0 ? 'baseline-target' : 'target-baseline'
  );
  const random = createPrng(seed);

  // Fisher-Yates shuffle using the seeded PRNG above.
  // Reference: https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
  for (let index = order.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return order;
};

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
  seed,
  baselineIdentity,
  targetIdentity,
}: {
  config: LoadedBenchConfig;
  leftContext: GlobalRunContext;
  rightContext: GlobalRunContext;
  seed: string;
  baselineIdentity: string;
  targetIdentity: string;
}): Promise<{ left: ConfigResult; right: ConfigResult; pairedComparison: PairedComparisonResult }> {
  if (!config.comparisonRun || config.comparisonRun.mode !== 'randomized_paired') {
    throw new Error(`Config ${config.name} does not request randomized paired comparison`);
  }
  if (config.profile) {
    throw new Error('Randomized paired comparison does not support CPU profiling');
  }

  const leftBenchmarks: BenchmarkResult[] = [];
  const rightBenchmarks: BenchmarkResult[] = [];
  const pairedBenchmarks: PairedBenchmarkComparison[] = [];
  const { pairs, maxAttempts } = config.comparisonRun;
  const order = [
    ...createPairedOrder({ pairs, seed }),
    ...createPairedOrder({
      pairs: maxAttempts - pairs,
      seed: `${seed}|replacement-attempts`,
    }),
  ];

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
      attemptedPairs: Math.min(maxAttempts, starts.length / 2),
      validPairs,
      starts,
      order,
    });
  }

  const pairedComparison: PairedComparisonResult = {
    mode: 'randomized_paired',
    seed,
    baselineIdentity,
    targetIdentity,
    benchmarks: pairedBenchmarks,
  };
  const left: ConfigResult = { config, benchmarks: leftBenchmarks, pairedComparison };
  const right: ConfigResult = { config, benchmarks: rightBenchmarks, pairedComparison };
  return { left, right, pairedComparison };
}
