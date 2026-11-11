/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ConfigComparison } from '../report/to_config_comparison';
import type { ConfigSummary } from '../report/to_config_summary';
import type { BenchmarkRunResult, ConfigResult } from '../runner/types';

export type CompareExists = 'lhs' | 'virtual' | 'rhs';
export type CompareMissing = 'skip' | 'lhs' | 'virtual';

export interface BenchmarkBase {
  kind: string;
  name: string;
  tags?: string[];
  description?: string;
  runs?: number;
  timeout?: number;
  skip?: boolean;
  compare?: {
    exists?: CompareExists;
    missing?: CompareMissing;
  };
}

export interface ModuleBenchmark extends BenchmarkBase {
  kind: 'module';
  module: string;
}

export type Script = string | { cwd?: string; cmd: string; args?: string[] };

export interface ScriptBenchmark extends BenchmarkBase {
  kind: 'script';
  ensure?: {
    bootstrap?: boolean;
    build?: boolean;
  };
  beforeAll?: Script;
  afterAll?: Script;
  before?: Script;
  after?: Script;
  run: Script;
}

export type Benchmark = ModuleBenchmark | ScriptBenchmark;

export interface PairedComparisonRun {
  readonly mode: 'paired';
  readonly pairs: number;
  readonly maxAttempts: number;
}

export interface PairedComparisonStart {
  readonly attempt: number;
  readonly pair?: number;
  readonly side: 'baseline' | 'target';
  readonly orderPosition: 0 | 1;
  readonly result: BenchmarkRunResult;
}

export interface PairedComparisonPair {
  readonly pair: number;
  readonly baseline: PairedComparisonStart;
  readonly target: PairedComparisonStart;
}

export interface PairedBenchmarkComparison {
  readonly benchmarkName: string;
  readonly requestedPairs: number;
  readonly attemptedPairs: number;
  readonly validPairs: readonly PairedComparisonPair[];
  readonly starts: readonly PairedComparisonStart[];
  readonly order: ReadonlyArray<'baseline-target' | 'target-baseline'>;
}

export interface PairedComparisonResult {
  readonly mode: 'paired';
  readonly baselineIdentity: string;
  readonly targetIdentity: string;
  readonly benchmarks: readonly PairedBenchmarkComparison[];
}

export interface OnCompareContext {
  log: ToolingLog;
  left: ConfigResult;
  right: ConfigResult;
  leftSummary: ConfigSummary;
  rightSummary: ConfigSummary;
  comparison: ConfigComparison;
  pairedComparison?: PairedComparisonResult;
}

export type OnCompareCallback = (context: OnCompareContext) => void | Promise<void>;

export interface InitialBenchConfig {
  name: string;
  benchmarks: Benchmark[];
  runs?: number;
  tags?: string[];
  timeout?: number;
  monitorInterval?: number;
  profile?: boolean;
  openProfile?: boolean;
  onCompare?: OnCompareCallback;
  comparisonRun?: PairedComparisonRun;
}

export interface InitialBenchConfigWithPath extends InitialBenchConfig {
  path: string;
}

export interface LoadedBenchConfig extends InitialBenchConfigWithPath {
  runs: number;
  tags: string[];
  timeout: number;
  monitorInterval: number;
  profile: boolean;
  openProfile: boolean;
  tracing: boolean;
  grep: string[] | undefined;
  benchmarks: Benchmark[];
  comparisonRun?: PairedComparisonRun;
}

export interface GlobalBenchConfig {
  runs?: number;
  profile?: boolean;
  openProfile?: boolean;
  tracing?: boolean;
  grep?: string[];
  monitorInterval?: number;
}
