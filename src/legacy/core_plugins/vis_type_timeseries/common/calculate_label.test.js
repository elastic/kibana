/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
