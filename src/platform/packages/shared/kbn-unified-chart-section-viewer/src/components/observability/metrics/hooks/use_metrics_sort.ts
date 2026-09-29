/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { MetricsSortBy, MetricsSortDirection, ParsedMetricItem } from '../../../../types';
import { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from '../../../../common/constants';
import { getMetricUniqueKey } from '../../../../common/utils/get_metric_unique_key';

type MetricComparator = (a: ParsedMetricItem, b: ParsedMetricItem) => number;

const alphabeticalComparator = (direction: MetricsSortDirection): MetricComparator => {
  const factor = direction === METRICS_SORT_DIRECTION.desc ? -1 : 1;
  return (a, b) => factor * a.metricName.localeCompare(b.metricName);
};

const recencyComparator = (
  recentlyExploredMetrics: readonly string[],
  direction: MetricsSortDirection
): MetricComparator => {
  const factor = direction === METRICS_SORT_DIRECTION.desc ? -1 : 1;
  // Metric unique key to recency rank (0 = most recent). Absent keys are unvisited.
  const rankByKey = new Map(recentlyExploredMetrics.map((key, index) => [key, index]));
  const unvisitedRank = rankByKey.size; // last in the list

  return (a, b) => {
    const ra = rankByKey.get(getMetricUniqueKey(a)) ?? unvisitedRank;
    const rb = rankByKey.get(getMetricUniqueKey(b)) ?? unvisitedRank;
    return ra !== rb ? factor * (ra - rb) : a.metricName.localeCompare(b.metricName);
  };
};

const metricComparators: Record<
  MetricsSortBy,
  (args: {
    direction: MetricsSortDirection;
    recentlyExploredMetrics: readonly string[];
  }) => MetricComparator
> = {
  [METRICS_SORT_BY.alphabetically]: ({ direction }) => alphabeticalComparator(direction),
  [METRICS_SORT_BY.recency]: ({ direction, recentlyExploredMetrics }) =>
    recencyComparator(recentlyExploredMetrics, direction),
};

export const useMetricsSort = ({
  metricItems,
  sortBy,
  direction,
  recentlyExploredMetrics = [],
}: {
  metricItems: ParsedMetricItem[];
  sortBy: MetricsSortBy;
  direction: MetricsSortDirection;
  recentlyExploredMetrics?: readonly string[];
}) => {
  const sortedMetricItems = useMemo(() => {
    const comparator = metricComparators[sortBy]({ direction, recentlyExploredMetrics });
    return [...metricItems].sort(comparator);
  }, [metricItems, sortBy, direction, recentlyExploredMetrics]);

  return { sortedMetricItems };
};
