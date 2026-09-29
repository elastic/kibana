/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { LoadedBenchConfig } from './config/types';
import { runPairedConfig } from './run_paired_config';
import { fromModuleBenchmark } from './runner/from_module_benchmark';
import { createBenchmarkExecutor, type BenchmarkExecutor } from './runner/run_benchmark';
import type { ProcStats } from './runner/monitor/types';
import type { BenchmarkRunResult } from './runner/types';
import type { GlobalRunContext } from './types';

vi.mock('./runner/from_module_benchmark');
vi.mock('./runner/run_benchmark');

const mockedFromModuleBenchmark = fromModuleBenchmark as MockedFunction<typeof fromModuleBenchmark>;
const mockedCreateBenchmarkExecutor = createBenchmarkExecutor as MockedFunction<
  typeof createBenchmarkExecutor
>;

const completedProcStats: ProcStats = {
  pid: 1,
  argv: [],
  heapUsage: 1,
  heapUsed: 1,
  heapTotal: 1,
  external: 1,
  arrayBuffers: 1,
  cpuUsage: 1,
  rss: 1,
  rssMax: 1,
  tailRss: 1,
  tailHeapUsed: 1,
  tailHeapTotal: 1,
  tailExternal: 1,
  tailArrayBuffers: 1,
  gcTotal: 1,
  gcMajor: 1,
  gcMinor: 1,
  gcIncremental: 1,
  gcWeakCb: 1,
};

const completedRun = (): BenchmarkRunResult => ({
  status: 'completed',
  time: 1,
  metrics: {},
  stats: [completedProcStats],
  samples: [],
});

const failedRun = (): BenchmarkRunResult => ({
  status: 'failed',
  error: new Error('start failed'),
  stats: [],
  samples: [],
});

const createContext = (buildDir: string): GlobalRunContext => ({ buildDir } as GlobalRunContext);

const config: LoadedBenchConfig = {
  name: 'paired-test',
  path: 'paired-test.config.ts',
  runs: 1,
  tags: [],
  timeout: 1_000,
  monitorInterval: 250,
  profile: false,
  openProfile: false,
  tracing: false,
  grep: undefined,
  comparisonRun: {
    mode: 'paired',
    pairs: 2,
    maxAttempts: 3,
  },
  benchmarks: [
    {
      kind: 'module',
      name: 'warm_start',
      module: './warm_start.bench',
    },
  ],
};

describe('runPairedConfig', () => {
  beforeEach(() => {
    mockedFromModuleBenchmark.mockResolvedValue({ run: async () => {} });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('alternates starts, discards whole invalid pairs, and cleans up both sides', async () => {
    const lifecycle: string[] = [];
    const baselineResults = [failedRun(), completedRun(), completedRun()];
    const targetResults = [completedRun(), completedRun(), completedRun()];
    const createExecutor = (side: 'baseline' | 'target', results: BenchmarkRunResult[]) => {
      const executor: BenchmarkExecutor = {
        beforeAll: vi.fn(async () => {
          lifecycle.push(`${side}:beforeAll`);
        }),
        run: vi.fn(async () => {
          lifecycle.push(`${side}:run`);
          return results.shift() ?? completedRun();
        }),
        afterAll: vi.fn(async () => {
          lifecycle.push(`${side}:afterAll`);
        }),
        profilesDir: '',
      };
      return executor;
    };
    const baselineExecutor = createExecutor('baseline', baselineResults);
    const targetExecutor = createExecutor('target', targetResults);

    mockedCreateBenchmarkExecutor.mockImplementation(({ context }) =>
      context.buildDir === 'baseline-build' ? baselineExecutor : targetExecutor
    );

    const { pairedComparison, left, right } = await runPairedConfig({
      config,
      leftContext: createContext('baseline-build'),
      rightContext: createContext('target-build'),
      baselineIdentity: 'baseline',
      targetIdentity: 'target',
    });

    const [benchmark] = pairedComparison.benchmarks;
    expect(benchmark.order).toEqual(['baseline-target', 'target-baseline', 'baseline-target']);
    expect(benchmark.attemptedPairs).toBe(3);
    expect(benchmark.validPairs).toHaveLength(2);
    expect(benchmark.validPairs.map(({ pair }) => pair)).toEqual([0, 1]);
    expect(benchmark.starts.filter(({ pair }) => pair === undefined)).toHaveLength(2);
    expect(left.benchmarks[0].runs).toHaveLength(2);
    expect(right.benchmarks[0].runs).toHaveLength(2);
    expect(lifecycle).toEqual([
      'baseline:beforeAll',
      'target:beforeAll',
      'baseline:run',
      'target:run',
      'target:run',
      'baseline:run',
      'baseline:run',
      'target:run',
      'baseline:afterAll',
      'target:afterAll',
    ]);
  });
});
