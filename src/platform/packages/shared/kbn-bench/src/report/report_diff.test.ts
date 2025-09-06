/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { reportDiff } from './report_diff';
import type { ConfigResult, BenchmarkResult, BenchmarkRunResultCompleted } from '../runner/types';
import type { Benchmark } from '../config/types';

function makeCompletedRun(
  time: number,
  metrics: Record<string, number> = {}
): BenchmarkRunResultCompleted {
  return { status: 'completed', time, metrics };
}

function makeBenchmark(
  name: string,
  times: number[],
  metricsPerRun: Record<string, number>[] = []
): BenchmarkResult {
  return {
    benchmark: { name } as Benchmark,
    runs: times.map((t, i) => makeCompletedRun(t, metricsPerRun[i] || {})),
  };
}

function makeConfigResult(
  name: string,
  benches: Array<ReturnType<typeof makeBenchmark>>
): ConfigResult {
  const cfg: Partial<ConfigResult['config']> = {
    name,
    benchmarks: benches.map((bench) => bench.benchmark),
  };

  return {
    config: cfg as ConfigResult['config'],
    benchmarks: benches,
  };
}

describe('reportDiff', () => {
  const originalChalkLevel = chalk.level;

  beforeAll(() => {
    // disable chalk colors for snapshot stability
    chalk.level = 0;
  });

  afterAll(() => {
    chalk.level = originalChalkLevel;
  });

  test('handles added benchmark', () => {
    const left: ConfigResult[] = [];
    const right: ConfigResult[] = [
      makeConfigResult('cfg', [makeBenchmark('benchA', [1000, 1100], [{ x: 10 }, { x: 12 }])]),
    ];

    const out = reportDiff({ name: 'left', results: left }, { name: 'right', results: right });

    expect(out).toMatchInlineSnapshot(`
      "Benchmark diff: left -> right
      Config: cfg
       benchA [added]   right       Δ 
       Avg Time         — -> 1.1s   — 
       Std dev          — -> 50ms   — 
       x                — -> —      — 
       x (σ)            — -> —      —"
    `);
  });

  test('handles removed benchmark', () => {
    const left: ConfigResult[] = [
      makeConfigResult('cfg', [makeBenchmark('benchA', [1000, 900], [{ x: 10 }, { x: 8 }])]),
    ];
    const right: ConfigResult[] = [];

    const out = reportDiff({ name: 'left', results: left }, { name: 'right', results: right });

    expect(out).toMatchInlineSnapshot(`
      "Benchmark diff: left -> right
      Config: cfg
       benchA 2 runs [removed]   left         Δ            
       Avg Time                  950ms -> —   —            
       Std dev                   50ms -> —    —            
       x                         9 -> 9       0.00 (+0.0%) 
       x (σ)                     1 -> 1       0.00 (+0.0%)"
    `);
  });

  test('handles changed metrics', () => {
    const left: ConfigResult[] = [
      makeConfigResult('cfg', [
        makeBenchmark(
          'benchA',
          [1000, 900],
          [
            { x: 10, y: 5 },
            { x: 8, y: 6 },
          ]
        ),
        makeBenchmark('benchB', [500], [{ x: 3 }]),
      ]),
    ];
    const right: ConfigResult[] = [
      makeConfigResult('cfg', [
        makeBenchmark(
          'benchA',
          [1200, 1000],
          [
            { x: 11, y: 7 },
            { x: 9, y: 5 },
          ]
        ),
        makeBenchmark('benchC', [700], [{ z: 4 }]),
      ]),
    ];

    const out = reportDiff({ name: 'left', results: left }, { name: 'right', results: right });

    expect(out).toMatchInlineSnapshot(`
      "Benchmark diff: left -> right
      Config: cfg
       benchA 2 runs [-]   left            Δ                
       Avg Time            950ms -> 1.1s   -150.00 (-15.8%) 
       Std dev             50ms -> 100ms   -50.00 (-100.0%) 
       x                   9 -> 9          0.00 (+0.0%)     
       x (σ)               1 -> 1          0.00 (+0.0%)     
       y                   5.5 -> 5.5      0.00 (+0.0%)     
       y (σ)               0.5 -> 0.5      0.00 (+0.0%)"
    `);
  });
});
