/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import type { AggregatedOperator } from './query_profile_model';

export type OperatorCategory = 'exchange' | 'source' | 'filter' | 'aggregate' | 'compute' | 'other';

const OPERATOR_CATEGORIES: readonly OperatorCategory[] = [
  'source',
  'filter',
  'compute',
  'aggregate',
  'exchange',
  'other',
];

export interface CpuBreakdownEntry {
  category: OperatorCategory;
  nanos: number;
  /** Share of the categorized CPU time, from 0 to 1. */
  share: number;
}

/** Groups a shortened operator class by the kind of work it does. */
export const operatorCategory = (title: string): OperatorCategory => {
  const name = title.toLowerCase();

  if (name.includes('exchange') || name.includes('merge')) {
    return 'exchange';
  }
  if (name.includes('reader') || name.includes('source') || name.includes('scan')) {
    return 'source';
  }
  if (name.includes('limit') || name.includes('filter')) {
    return 'filter';
  }
  if (name.includes('aggregat') || name.includes('stats') || name.includes('topn')) {
    return 'aggregate';
  }
  if (name.includes('eval') || name.includes('project')) {
    return 'compute';
  }
  return 'other';
};

/** Operator CPU time grouped by kind of work. Operators that report no time are left out. */
export const summarizeCpuByCategory = (operators: AggregatedOperator[]): CpuBreakdownEntry[] => {
  const totals = new Map<OperatorCategory, number>();
  operators.forEach((operator) => {
    if (!operator.timeReported) {
      return;
    }
    const category = operatorCategory(operator.title);
    totals.set(category, (totals.get(category) ?? 0) + operator.processNanos);
  });

  const total = [...totals.values()].reduce((sum, nanos) => sum + nanos, 0);
  if (total <= 0) {
    return [];
  }

  return OPERATOR_CATEGORIES.flatMap((category) => {
    const nanos = totals.get(category) ?? 0;
    return nanos > 0 ? [{ category, nanos, share: nanos / total }] : [];
  });
};

/** One color per kind of work, shared by every part of the profile that colors operators. */
export const useOperatorCategoryColors = (): Record<OperatorCategory, string> => {
  const { euiTheme } = useEuiTheme();

  return {
    source: euiTheme.colors.vis.euiColorVis0,
    filter: euiTheme.colors.vis.euiColorVis2,
    compute: euiTheme.colors.vis.euiColorVis4,
    aggregate: euiTheme.colors.vis.euiColorVis6,
    exchange: euiTheme.colors.vis.euiColorVis8,
    other: euiTheme.colors.mediumShade,
  };
};
