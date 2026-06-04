/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { OnCompareContext } from '@kbn/bench';
import {
  MAX_RSS_METRIC_KEY,
  TAIL_RSS_METRIC_KEY,
  WARM_START_BENCHMARK_NAME,
} from './median_max_rss';

const makeMetricSummary = (values: number[]) => {
  const count = values.length;
  const sum = values.reduce((total, value) => total + value, 0);
  const avg = sum / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / count;

  return {
    count,
    sum,
    avg,
    min,
    max,
    stdDev: Math.sqrt(variance),
    values,
  };
};

const makeWarmStartSummary = ({
  maxRssValues,
  tailRssValues,
}: {
  maxRssValues: number[];
  tailRssValues: number[];
}): OnCompareContext['leftSummary']['benchmarks'][number] => {
  return {
    name: WARM_START_BENCHMARK_NAME,
    completed: maxRssValues.length,
    failed: 0,
    metrics: {
      time: {
        title: 'Duration',
        format: 'duration',
        summary: makeMetricSummary(maxRssValues.map((_, index) => 1000 + index)),
      },
      [MAX_RSS_METRIC_KEY]: {
        title: 'Max RSS',
        format: 'size',
        summary: makeMetricSummary(maxRssValues),
      },
      [TAIL_RSS_METRIC_KEY]: {
        title: 'Tail RSS',
        format: 'size',
        summary: makeMetricSummary(tailRssValues),
      },
    },
  };
};

export const makeWarmStartMemoryCompareContext = ({
  baselineMaxRssValues,
  baselineTailRssValues = baselineMaxRssValues,
  targetMaxRssValues,
  targetTailRssValues = targetMaxRssValues,
}: {
  baselineMaxRssValues: number[];
  baselineTailRssValues?: number[];
  targetMaxRssValues: number[];
  targetTailRssValues?: number[];
}): OnCompareContext => {
  const leftSummary: OnCompareContext['leftSummary'] = {
    name: 'kibana_ci_warm_start_memory',
    benchmarks: [
      makeWarmStartSummary({
        maxRssValues: baselineMaxRssValues,
        tailRssValues: baselineTailRssValues,
      }),
    ],
  };
  const rightSummary: OnCompareContext['rightSummary'] = {
    name: 'kibana_ci_warm_start_memory',
    benchmarks: [
      makeWarmStartSummary({
        maxRssValues: targetMaxRssValues,
        tailRssValues: targetTailRssValues,
      }),
    ],
  };

  return {
    log: new ToolingLog({
      level: 'error',
      writeTo: {
        write: () => {},
      },
    }),
    left: {
      config: {
        name: 'kibana_ci_warm_start_memory',
      } as OnCompareContext['left']['config'],
      benchmarks: [],
    },
    right: {
      config: {
        name: 'kibana_ci_warm_start_memory',
      } as OnCompareContext['right']['config'],
      benchmarks: [],
    },
    leftSummary,
    rightSummary,
    comparison: {
      benchmarks: [],
    },
  };
};
