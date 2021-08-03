/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapEmptyToZero } from './map_empty_to_zero';

describe('mapEmptyToZero(metric, buckets)', () => {
  test('returns bucket key and value for basic metric', () => {
    const metric = { id: 'AVG', type: 'avg' };
    const buckets = [
      {
        key: 1234,
        AVG: { value: 1 },
      },
    ];
    expect(mapEmptyToZero(metric, buckets)).toEqual([[1234, 1]]);
  });
  test('returns bucket key and value for std_deviation', () => {
    const metric = { id: 'STDDEV', type: 'std_deviation' };
    const buckets = [
      {
        key: 1234,
        STDDEV: { std_deviation: 1 },
      },
    ];
    expect(mapEmptyToZero(metric, buckets)).toEqual([[1234, 1]]);
  });
  test('returns bucket key and value for percentiles', () => {
    const metric = { id: 'PCT', type: 'percentile', percent: 50 };
    const buckets = [
      {
        key: 1234,
        PCT: { values: { '50.0': 1 } },
      },
    ];
    expect(mapEmptyToZero(metric, buckets)).toEqual([[1234, 1]]);
  });
  test('returns bucket key and value for derivative', () => {
    const metric = { id: 'DERV', type: 'derivative', field: 'io', unit: '1s' };
    const buckets = [
      {
        key: 1234,
        DERV: { value: 100, normalized_value: 1 },
      },
    ];
    expect(mapEmptyToZero(metric, buckets)).toEqual([[1234, 1]]);
  });
});
