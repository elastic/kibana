/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnCompareContext } from '@kbn/bench';

export const WARM_START_BENCHMARK_NAME = 'warm_start';
export const MAX_RSS_METRIC_KEY = 'maxRssSize';

export const median = (values: readonly number[]): number => {
  if (values.length === 0) {
    throw new Error('Cannot compute median of an empty value set');
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

export const getMedianMaxRssBytes = (
  summary: OnCompareContext['leftSummary'],
  benchmarkName: string = WARM_START_BENCHMARK_NAME
): number => {
  const benchmark = summary.benchmarks.find(({ name }) => name === benchmarkName);

  if (!benchmark) {
    throw new Error(`Benchmark "${benchmarkName}" not found in benchmark summary`);
  }

  const maxRssMetric = benchmark.metrics[MAX_RSS_METRIC_KEY];
  const values = maxRssMetric?.summary?.values;

  if (!values?.length) {
    throw new Error(`Max RSS metric is missing for benchmark "${benchmarkName}"`);
  }

  return median(values);
};
