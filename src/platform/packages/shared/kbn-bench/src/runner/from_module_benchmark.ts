/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertRunnable } from './assert_runnable';
import type { ModuleBenchmark } from '../config/types';
import type { BenchmarkRunnable } from './types';

export async function fromModuleBenchmark(benchmark: ModuleBenchmark): Promise<BenchmarkRunnable> {
  const m = await import(benchmark.module);

  const module = m.default || m.config || m;

  const runnable = typeof module === 'function' ? await module() : module;

  assertRunnable(runnable);

  return runnable;
}
