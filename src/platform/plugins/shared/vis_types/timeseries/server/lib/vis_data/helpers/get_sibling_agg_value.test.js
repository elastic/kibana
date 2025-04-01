/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSiblingAggValue } from './get_sibling_agg_value';

describe('getSiblingAggValue', () => {
  const row = {
    test: {
      max: 3,
      std_deviation: 1.5,
      std_deviation_bounds: {
        upper: 2,
        lower: 1,
      },
    },
  };

  test('returns the value for std_deviation_bounds.upper', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'upper' };
    expect(getSiblingAggValue(row, metric)).toEqual(2);
  });

  test('returns the value for std_deviation_bounds.lower', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'lower' };
    expect(getSiblingAggValue(row, metric)).toEqual(1);
  });

  test('returns the value for std_deviation', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'raw' };
    expect(getSiblingAggValue(row, metric)).toEqual(1.5);
  });

  test('returns the value for basic (max)', () => {
    const metric = { id: 'test', type: 'max_bucket' };
    expect(getSiblingAggValue(row, metric)).toEqual(3);
  });
});
