/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryProfileView } from './aggregate_esql_profile';

/** A change smaller than this share of the baseline counts as noise. Single runs vary. */
const SAME_RATIO = 0.05;
const SAME_MILLIS = 1;
const SAME_OPERATOR_NANOS = 100_000;
const MAX_OPERATORS = 8;

export type Trend = 'faster' | 'slower' | 'same';

export interface MetricComparison {
  baseline: number;
  current: number;
  /** Change as a share of the baseline. Undefined when the baseline is 0. */
  ratio?: number;
  trend: Trend;
}

export interface OperatorComparison {
  title: string;
  /** Undefined when the operator only exists in the current run. */
  baselineNanos?: number;
  /** Undefined when the operator only exists in the baseline run. */
  currentNanos?: number;
  deltaNanos: number;
  ratio?: number;
  trend: Trend;
}

export interface ProfileComparison {
  total?: MetricComparison;
  planning?: MetricComparison;
  execution?: MetricComparison;
  /** Operator CPU time in milliseconds, summed over every operator that reports a time. */
  cpu?: MetricComparison;
  /** The operators that changed noticeably, biggest change first. */
  operators: OperatorComparison[];
}

function compareMetric(
  baseline: number | undefined,
  current: number | undefined,
  minimumChange: number
): MetricComparison | undefined {
  if (baseline === undefined || current === undefined) {
    return undefined;
  }

  const delta = current - baseline;
  const ratio = baseline > 0 ? delta / baseline : undefined;
  const isNoise =
    Math.abs(delta) < minimumChange || (ratio !== undefined && Math.abs(ratio) < SAME_RATIO);
  const trend: Trend = isNoise ? 'same' : delta < 0 ? 'faster' : 'slower';
  return { baseline, current, ratio, trend };
}

/** Operator CPU time by title, so two runs line up even when operator details differ. */
function nanosByTitle(view: QueryProfileView): Map<string, number> {
  const totals = new Map<string, number>();
  view.operators.forEach((operator) => {
    if (operator.timeReported) {
      totals.set(operator.title, (totals.get(operator.title) ?? 0) + operator.processNanos);
    }
  });
  return totals;
}

function totalNanos(totals: Map<string, number>): number {
  return [...totals.values()].reduce((sum, nanos) => sum + nanos, 0);
}

/** Compares a run against a baseline. Positive changes mean the current run is slower. */
export function compareProfiles(
  baseline: QueryProfileView,
  current: QueryProfileView
): ProfileComparison {
  const baselineNanos = nanosByTitle(baseline);
  const currentNanos = nanosByTitle(current);

  const operators = [...new Set([...baselineNanos.keys(), ...currentNanos.keys()])]
    .flatMap((title) => {
      const before = baselineNanos.get(title);
      const after = currentNanos.get(title);
      const metric = compareMetric(before ?? 0, after ?? 0, SAME_OPERATOR_NANOS);
      if (!metric || metric.trend === 'same') {
        return [];
      }
      return [
        {
          title,
          baselineNanos: before,
          currentNanos: after,
          deltaNanos: (after ?? 0) - (before ?? 0),
          ratio: metric.ratio,
          trend: metric.trend,
        },
      ];
    })
    .sort((left, right) => Math.abs(right.deltaNanos) - Math.abs(left.deltaNanos))
    .slice(0, MAX_OPERATORS);

  return {
    total: compareMetric(baseline.queryTookMillis, current.queryTookMillis, SAME_MILLIS),
    planning: compareMetric(baseline.planningTookMillis, current.planningTookMillis, SAME_MILLIS),
    execution: compareMetric(
      baseline.executionTookMillis,
      current.executionTookMillis,
      SAME_MILLIS
    ),
    cpu: compareMetric(
      totalNanos(baselineNanos) / 1e6,
      totalNanos(currentNanos) / 1e6,
      SAME_MILLIS
    ),
    operators,
  };
}
