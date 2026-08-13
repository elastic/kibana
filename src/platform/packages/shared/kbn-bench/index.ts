/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  ModuleBenchmark,
  ScriptBenchmark,
  InitialBenchConfig,
  OnCompareCallback,
  OnCompareContext,
  PairedComparisonStart,
} from './src/config/types';
export type { BenchmarkRunContext, BenchmarkRunnable } from './src/runner/types';
export type { ForcedGcHeapStats } from './src/runner/monitor/types';

export { cli } from './src/cli';
export { aggregateForcedGcHeapStats, aggregateProcStats } from './src/report/aggregate_proc_stats';
export { createPairedOrder } from './src/run_paired_config';
