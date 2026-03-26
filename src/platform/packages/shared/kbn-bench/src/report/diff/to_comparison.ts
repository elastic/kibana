/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BenchmarkSummary } from '../to_benchmark_summary';
import type { MetricFormat, MetricSummary } from '../types';
import type { ConfidenceInterval } from './get_confidence_interval';
import { getConfidenceInterval } from './get_confidence_interval';

export interface BenchmarkMetricDiff {
  title: string;
  format: MetricFormat;
  left: MetricSummary | null;
  right: MetricSummary | null;
  diff: {
    absolute: number;
    relative: number;
  } | null;
  ci: ConfidenceInterval | null;
}

export interface BenchmarkDiff {
  sides: {
    left: {
      name: string;
    };
    right: {
      name: string;
    };
  };
  metrics: BenchmarkMetricDiff[];
}

export function toBenchmarkDiff({
  left,
  right,
}: {
  left?: BenchmarkSummary;
  right?: BenchmarkSummary;
}): BenchmarkDiff {
  const metricConfigs = {
    ...left?.metrics,
    ...right?.metrics,
  };

  const metricKeys = Object.keys(metricConfigs);

  return {
    sides: {
      left: {
        name: left?.name || 'left',
      },
      right: {
        name: right?.name || 'right',
      },
    },
    metrics: metricKeys.map((metricName) => {
      const metricConfig = metricConfigs[metricName];

      const leftSummary = left?.metrics[metricName]?.summary ?? null;
      const rightSummary = right?.metrics[metricName]?.summary ?? null;

      const leftVal = leftSummary?.avg ?? null;
      const rightVal = rightSummary?.avg ?? null;

      return {
        title: metricConfig.title,
        format: metricConfig.format ?? 'number',
        left: leftSummary,
        right: rightSummary,
        ci: getConfidenceInterval(leftSummary, rightSummary),
        diff:
          leftVal !== null && rightVal !== null
            ? {
                absolute: rightVal - leftVal,
                relative: (rightVal - leftVal) / leftVal,
              }
            : null,
      };
    }),
  };
}
