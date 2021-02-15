/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateLabel } from './calculate_label';

describe('calculateLabel(metric, metrics)', () => {
  test('returns "Unknown" for empty metric', () => {
    expect(calculateLabel()).toEqual('Unknown');
  });

  test('returns the metric.alias if set', () => {
    expect(calculateLabel({ alias: 'Example' })).toEqual('Example');
  });

  test('returns "Count" for a count metric', () => {
    expect(calculateLabel({ type: 'count' })).toEqual('Count');
  });

  test('returns "Calculation" for a bucket script metric', () => {
    expect(calculateLabel({ type: 'calculation' })).toEqual('Bucket Script');
  });

  test('returns formated label for series_agg', () => {
    const label = calculateLabel({ type: 'series_agg', function: 'max' });
    expect(label).toEqual('Series Agg (max)');
  });

  test('returns formated label for basic aggs', () => {
    const label = calculateLabel({ type: 'avg', field: 'memory' });
    expect(label).toEqual('Average of memory');
  });

  test('returns formated label for pipeline aggs', () => {
    const metric = { id: 2, type: 'derivative', field: 1 };
    const metrics = [{ id: 1, type: 'max', field: 'network.out.bytes' }, metric];
    const label = calculateLabel(metric, metrics);
    expect(label).toEqual('Derivative of Max of network.out.bytes');
  });

  test('returns formated label for derivative of percentile', () => {
    const metric = { id: 2, type: 'derivative', field: '1[50.0]' };
    const metrics = [{ id: 1, type: 'percentile', field: 'network.out.bytes' }, metric];
    const label = calculateLabel(metric, metrics);
    expect(label).toEqual('Derivative of Percentile of network.out.bytes (50.0)');
  });

  test('returns formated label for pipeline aggs (deep)', () => {
    const metric = { id: 3, type: 'derivative', field: 2 };
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes' },
      { id: 2, type: 'moving_average', field: 1 },
      metric,
    ];
    const label = calculateLabel(metric, metrics);
    expect(label).toEqual('Derivative of Moving Average of Max of network.out.bytes');
  });

  test('returns formated label for pipeline aggs uses alias for field metric', () => {
    const metric = { id: 2, type: 'derivative', field: 1 };
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes', alias: 'Outbound Traffic' },
      metric,
    ];
    const label = calculateLabel(metric, metrics);
    expect(label).toEqual('Derivative of Outbound Traffic');
  });
});
