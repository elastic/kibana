/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { PickByValue } from 'utility-types';
import type { MetricsSortBy, MetricsSortDirection, ParsedMetricItem } from '../../../../types';
import { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from '../../../../common/constants';

type MetricSortValue = string | number;
type SortableMetricField = keyof PickByValue<ParsedMetricItem, string | number>;
// Metrics id points to the metric field it orders by
const metricSortFields: Record<MetricsSortBy, SortableMetricField> = {
  [METRICS_SORT_BY.alphabetically]: 'metricName',
};

const compareValues = (a: MetricSortValue, b: MetricSortValue): number =>
  typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));

export const useMetricsSort = ({
  metricItems,
  sortBy,
  direction,
}: {
  metricItems: ParsedMetricItem[];
  sortBy: MetricsSortBy;
  direction: MetricsSortDirection;
}) => {
  const sortedMetricItems = useMemo(() => {
    const field = metricSortFields[sortBy];
    const directionFactor = direction === METRICS_SORT_DIRECTION.desc ? -1 : 1;
    return [...metricItems].sort((a, b) => directionFactor * compareValues(a[field], b[field]));
  }, [metricItems, sortBy, direction]);

  return { sortedMetricItems };
};
