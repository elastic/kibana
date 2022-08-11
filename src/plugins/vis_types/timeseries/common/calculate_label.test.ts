/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateLabel } from './calculate_label';
import type { Metric } from './types';
import { SanitizedFieldType } from './types';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/common';

describe('calculateLabel(metric, metrics)', () => {
  test('returns the metric.alias if set', () => {
    expect(calculateLabel({ alias: 'Example' } as Metric)).toEqual('Example');
  });

  test('returns "Count" for a count metric', () => {
    expect(calculateLabel({ type: 'count' } as Metric)).toEqual('Count');
  });

  test('returns "Calculation" for a bucket script metric', () => {
    expect(calculateLabel({ type: 'calculation' } as Metric)).toEqual('Bucket Script');
  });

  test('returns formatted label for series_agg', () => {
    const label = calculateLabel({ type: 'series_agg', function: 'max' } as Metric);

    expect(label).toEqual('Series Agg (max)');
  });

  test('returns formatted label for basic aggs', () => {
    const label = calculateLabel({ type: 'avg', field: 'memory' } as Metric);

    expect(label).toEqual('Average of memory');
  });

  test('returns formatted label for pipeline aggs', () => {
    const metric = { id: 2, type: 'derivative', field: 1 } as unknown as Metric;
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes' },
      metric,
    ] as unknown as Metric[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Max of network.out.bytes');
  });

  test('returns formatted label for derivative of percentile', () => {
    const metric = {
      id: 2,
      type: 'derivative',
      field: '1[50.0]',
    } as unknown as Metric;
    const metrics = [
      { id: 1, type: 'percentile', field: 'network.out.bytes' },
      metric,
    ] as unknown as Metric[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Percentile of network.out.bytes (50.0)');
  });

  test('returns formatted label for pipeline aggs (deep)', () => {
    const metric = { id: 3, type: 'derivative', field: 2 } as unknown as Metric;
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes' },
      { id: 2, type: 'moving_average', field: 1 },
      metric,
    ] as unknown as Metric[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Moving Average of Max of network.out.bytes');
  });

  test('returns formatted label for pipeline aggs uses alias for field metric', () => {
    const metric = { id: 2, type: 'derivative', field: 1 } as unknown as Metric;
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes', alias: 'Outbound Traffic' },
      metric,
    ] as unknown as Metric[];
    const label = calculateLabel(metric, metrics);

    expect(label).toEqual('Derivative of Outbound Traffic');
  });

  test('should throw an error if field not found', () => {
    const metric = { id: 2, type: 'max', field: 3 } as unknown as Metric;
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes', alias: 'Outbound Traffic' },
      metric,
    ] as unknown as Metric[];
    const fields: SanitizedFieldType[] = [{ name: '2', label: '2', type: KBN_FIELD_TYPES.DATE }];

    expect(() => calculateLabel(metric, metrics, fields)).toThrowError('Field "3" not found');
  });

  test('should not throw an error if field not found (isThrowErrorOnFieldNotFound is false)', () => {
    const metric = { id: 2, type: 'max', field: 3 } as unknown as Metric;
    const metrics = [
      { id: 1, type: 'max', field: 'network.out.bytes', alias: 'Outbound Traffic' },
      metric,
    ] as unknown as Metric[];
    const fields: SanitizedFieldType[] = [{ name: '2', label: '2', type: KBN_FIELD_TYPES.DATE }];

    expect(calculateLabel(metric, metrics, fields, false)).toBe('Max of 3');
  });
});
