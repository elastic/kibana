/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useMetricsSort } from './use_metrics_sort';
import { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from '../../../../common/constants';
import type { ParsedMetricItem } from '../../../../types';

const makeMetric = (metricName: string): ParsedMetricItem => ({
  metricName,
  indexName: 'metrics-*',
  units: [],
  metricTypes: [],
  fieldTypes: [],
  dimensionFields: [],
});

const names = (items: ParsedMetricItem[]) => items.map((item) => item.metricName);

describe('useMetricsSort', () => {
  const metricItems = [makeMetric('cpu'), makeMetric('memory'), makeMetric('disk')];

  it('sorts ascending by metricName', () => {
    const { result } = renderHook(() =>
      useMetricsSort({
        metricItems,
        sortBy: METRICS_SORT_BY.alphabetically,
        direction: METRICS_SORT_DIRECTION.asc,
      })
    );

    expect(names(result.current.sortedMetricItems)).toEqual(['cpu', 'disk', 'memory']);
  });

  it('sorts descending by metricName', () => {
    const { result } = renderHook(() =>
      useMetricsSort({
        metricItems,
        sortBy: METRICS_SORT_BY.alphabetically,
        direction: METRICS_SORT_DIRECTION.desc,
      })
    );

    expect(names(result.current.sortedMetricItems)).toEqual(['memory', 'disk', 'cpu']);
  });

  it('does not mutate the input array', () => {
    const { result } = renderHook(() =>
      useMetricsSort({
        metricItems,
        sortBy: METRICS_SORT_BY.alphabetically,
        direction: METRICS_SORT_DIRECTION.asc,
      })
    );

    expect(names(metricItems)).toEqual(['cpu', 'memory', 'disk']);
    expect(result.current.sortedMetricItems).not.toBe(metricItems);
  });
});
