/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { calculateLabel } from './calculate_label';
import type { MetricsItemsSchema } from './types';

describe('calculateLabel(metric, metrics)', () => {
  test('returns the metric.alias if set', () => {
    expect(calculateLabel({ alias: 'Example' } as MetricsItemsSchema)).toEqual('Example');
  });

  test('returns "Count" for a count metric', () => {
    expect(calculateLabel({ type: 'count' } as MetricsItemsSchema)).toEqual('Count');
  });

  test('returns "Calculation" for a bucket script metric', () => {
    expect(calculateLabel({ type: 'calculation' } as MetricsItemsSchema)).toEqual('Bucket Script');
  });

  test('returns formatted label for series_agg', () => {
    const label = calculateLabel({ type: 'series_agg', function: 'max' } as MetricsItemsSchema);

    expect(label).toEqual('Series Agg (max)');
  });

  test('returns formatted label for basic aggs', () => {
    const label = calculateLabel({ type: 'avg', field: 'memory' } as MetricsItemsSchema);

    expect(label).toEqual('Average of memory');
  });

  test('returns formatted label for pipeline aggs', () => {
    const metric = ({ id: 2, type: 'derivative', field: 1 } as unknown) as MetricsItemsSchema;
    const metrics = ([
      { id: 1, type: 'max', field: 'network.out.bytes' },
      metric,
    ] as unknown) as MetricsItemsSchema[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Max of network.out.bytes');
  });

  test('returns formatted label for derivative of percentile', () => {
    const metric = ({
      id: 2,
      type: 'derivative',
      field: '1[50.0]',
    } as unknown) as MetricsItemsSchema;
    const metrics = ([
      { id: 1, type: 'percentile', field: 'network.out.bytes' },
      metric,
    ] as unknown) as MetricsItemsSchema[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Percentile of network.out.bytes (50.0)');
  });

  test('returns formatted label for pipeline aggs (deep)', () => {
    const metric = ({ id: 3, type: 'derivative', field: 2 } as unknown) as MetricsItemsSchema;
    const metrics = ([
      { id: 1, type: 'max', field: 'network.out.bytes' },
      { id: 2, type: 'moving_average', field: 1 },
      metric,
    ] as unknown) as MetricsItemsSchema[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Moving Average of Max of network.out.bytes');
  });

  test('returns formatted label for pipeline aggs uses alias for field metric', () => {
    const metric = ({ id: 2, type: 'derivative', field: 1 } as unknown) as MetricsItemsSchema;
    const metrics = ([
      { id: 1, type: 'max', field: 'network.out.bytes', alias: 'Outbound Traffic' },
      metric,
    ] as unknown) as MetricsItemsSchema[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Outbound Traffic');
  });
});
