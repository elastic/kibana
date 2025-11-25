/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sum } from 'lodash';
import type { MetricSummary } from './types';

/**
 * Create summary (avg/min/max/sum/count/stdDev) of set of values
 */
export function toMetricSummary(values: number[]): MetricSummary | null {
  if (!values.length) {
    return null;
  }

  const count = values.length;
  const sumOf = sum(values);
  const avg = sumOf / count;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / count;

  const stdDev = Math.sqrt(variance);

  return {
    avg,
    min,
    max,
    sum: sumOf,
    stdDev,
    count,
    values,
  };
}
