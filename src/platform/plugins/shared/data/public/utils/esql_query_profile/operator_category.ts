/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AggregatedOperator } from './types';

/** The kinds of work that the CPU breakdown tells apart, in the order they are shown. */
const OPERATOR_CATEGORIES = [
  'read',
  'filter_and_limit',
  'compute',
  'aggregate_and_sort',
  'exchange',
  'other',
] as const;

export type OperatorCategory = (typeof OPERATOR_CATEGORIES)[number];

const CATEGORY_LABELS: Record<OperatorCategory, () => string> = {
  read: () =>
    i18n.translate('data.inspector.queryProfile.categoryReadLabel', { defaultMessage: 'Read' }),
  filter_and_limit: () =>
    i18n.translate('data.inspector.queryProfile.categoryFilterLabel', {
      defaultMessage: 'Filter and limit',
    }),
  compute: () =>
    i18n.translate('data.inspector.queryProfile.categoryComputeLabel', {
      defaultMessage: 'Compute',
    }),
  aggregate_and_sort: () =>
    i18n.translate('data.inspector.queryProfile.categoryAggregateLabel', {
      defaultMessage: 'Aggregate and sort',
    }),
  exchange: () =>
    i18n.translate('data.inspector.queryProfile.categoryExchangeLabel', {
      defaultMessage: 'Exchange',
    }),
  other: () =>
    i18n.translate('data.inspector.queryProfile.categoryOtherLabel', { defaultMessage: 'Other' }),
};

export const operatorCategoryLabel = (category: OperatorCategory): string =>
  CATEGORY_LABELS[category]();

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
    return 'read';
  }
  if (name.includes('limit') || name.includes('filter')) {
    return 'filter_and_limit';
  }
  if (name.includes('aggregat') || name.includes('stats') || name.includes('topn')) {
    return 'aggregate_and_sort';
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
    read: euiTheme.colors.vis.euiColorVis0,
    filter_and_limit: euiTheme.colors.vis.euiColorVis2,
    compute: euiTheme.colors.vis.euiColorVis4,
    aggregate_and_sort: euiTheme.colors.vis.euiColorVis6,
    exchange: euiTheme.colors.vis.euiColorVis8,
    other: euiTheme.colors.mediumShade,
  };
};
