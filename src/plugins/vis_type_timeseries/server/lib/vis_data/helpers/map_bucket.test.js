/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapBucket } from './map_bucket';

describe('mapBucket(metric)', () => {
  test('returns bucket key and value for basic metric', () => {
    const metric = { id: 'AVG', type: 'avg' };
    const bucket = {
      key: 1234,
      AVG: { value: 1 },
    };
    expect(mapBucket(metric)(bucket)).toEqual([1234, 1]);
  });
  test('returns bucket key and value for std_deviation', () => {
    const metric = { id: 'STDDEV', type: 'std_deviation' };
    const bucket = {
      key: 1234,
      STDDEV: { std_deviation: 1 },
    };
    expect(mapBucket(metric)(bucket)).toEqual([1234, 1]);
  });
  test('returns bucket key and value for percentiles', () => {
    const metric = { id: 'PCT', type: 'percentile', percent: 50 };
    const bucket = {
      key: 1234,
      PCT: { values: { '50.0': 1 } },
    };
    expect(mapBucket(metric)(bucket)).toEqual([1234, 1]);
  });
  test('returns bucket key and value for derivative', () => {
    const metric = { id: 'DERV', type: 'derivative', field: 'io', unit: '1s' };
    const bucket = {
      key: 1234,
      DERV: { value: 100, normalized_value: 1 },
    };
    expect(mapBucket(metric)(bucket)).toEqual([1234, 1]);
  });
});
