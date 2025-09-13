/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapValues, sum } from 'lodash';
import type { BenchmarkRunResultCompleted, BenchmarkResult, ConfigResult } from '../runner/types';

export interface MetricSummary {
  count: number;
  sum: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
}

export interface BenchmarkSummary {
  name: string;
  completed: number;
  failed: number;
  time: MetricSummary;
  metrics: Record<string, { description: string; summary: MetricSummary }>;
}

export function formatDuration(ms: number | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  const fixed = s % 1 === 0 ? s.toFixed(0) : s.toFixed(1);
  return `${fixed}s`;
}

export function formatNumber(value: number | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);

  // Determine unit (simple K/M/B scaling)
  let divisor = 1;
  let suffix = '';
  if (abs >= 1_000_000_000) {
    divisor = 1_000_000_000;
    suffix = 'B';
  } else if (abs >= 1_000_000) {
    divisor = 1_000_000;
    suffix = 'M';
  } else if (abs >= 1_000) {
    divisor = 1_000;
    suffix = 'K';
  }

  const scaled = value / divisor;

  let str: string;
  if (Math.abs(scaled) >= 1) {
    // two digit precision above 1, trim trailing zeros
    str = scaled.toFixed(2);
    str = str.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  } else {
    // show up to 3 decimals when between -1 and 1
    str = scaled.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  return str + suffix;
}

function toMetricSummary(numbers: number[]): MetricSummary {
  if (!numbers.length) {
    return {
      avg: null,
      min: null,
      max: null,
      sum: null,
      stdDev: null,
      count: 0,
    };
  }

  const count = numbers.length;
  const sumOf = sum(numbers);
  const avg = sumOf / count;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  const variance = numbers.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / count;

  const stdDev = Math.sqrt(variance);

  return {
    avg,
    min,
    max,
    sum: sumOf,
    stdDev,
    count,
  };
}

export function summarizeBenchmark(result: BenchmarkResult): BenchmarkSummary {
  const completed = result.runs.filter(
    (r): r is BenchmarkRunResultCompleted => r.status === 'completed'
  );

  const numFailed = result.runs.length - completed.length;

  const times = completed.map((run) => run.time);

  const time = toMetricSummary(times);

  const metrics = completed.reduce((prev, run) => {
    Object.entries(run.metrics).forEach(([name, metric]) => {
      const { value, description } =
        typeof metric === 'number' ? { description: name, value: metric } : metric;

      if (!prev[name]) {
        prev[name] = { values: [value], description };
        return;
      }

      prev[name].values.push(value);
    });

    return prev;
  }, {} as Record<string, { values: number[]; description: string }>);

  return {
    name: result.benchmark.name,
    completed: completed.length,
    failed: numFailed,
    time,
    metrics: mapValues(metrics, (value, key) => {
      return {
        description: value.description,
        summary: toMetricSummary(value.values),
      };
    }),
  };
}

export function collectMetricKeys(config: ConfigResult): string[] {
  const set = new Set<string>();
  for (const b of config.benchmarks) {
    for (const run of b.runs) {
      if (run.status === 'completed') {
        for (const key of Object.keys(run.metrics)) set.add(key);
      }
    }
  }
  return Array.from(set).sort();
}
