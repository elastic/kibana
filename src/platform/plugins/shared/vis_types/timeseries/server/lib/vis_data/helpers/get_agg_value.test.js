/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAggValue } from './get_agg_value';

function testAgg(row, metric, expected) {
  let name = metric.type;
  if (metric.mode) name += `(${metric.mode})`;
  if (metric.percent) name += `(${metric.percent})`;
  test(`it should return ${name}(${expected})`, () => {
    const value = getAggValue(row, metric);
    expect(value).toEqual(expected);
  });
}

describe('getAggValue', () => {
  describe('extended_stats', () => {
    const row = {
      test: {
        count: 9,
        min: 72,
        max: 99,
        avg: 86,
        sum: 774,
        sum_of_squares: 67028,
        variance: 51.55555555555556,
        std_deviation: 7.180219742846005,
        std_deviation_bounds: {
          upper: 100.36043948569201,
          lower: 71.63956051430799,
        },
      },
    };
    testAgg(row, { id: 'test', type: 'std_deviation' }, 7.180219742846005);
    testAgg(row, { id: 'test', type: 'variance' }, 51.55555555555556);
    testAgg(row, { id: 'test', type: 'sum_of_squares' }, 67028);
    testAgg(row, { id: 'test', type: 'std_deviation', mode: 'upper' }, 100.36043948569201);
    testAgg(row, { id: 'test', type: 'std_deviation', mode: 'lower' }, 71.63956051430799);
  });

  describe('percentile', () => {
    const row = {
      test: {
        values: {
          '1.0': 15,
          '5.0': 20,
          '25.0': 23,
          '50.0': 25,
          '75.0': 29,
          '95.0': 60,
          '99.0': 150,
        },
      },
    };
    testAgg(row, { id: 'test', type: 'percentile', percent: '50' }, 25);
    testAgg(row, { id: 'test', type: 'percentile', percent: '1.0' }, 15);
  });

  describe('top hits', () => {
    const row = {
      test: {
        doc_count: 1,
        docs: {
          hits: {
            hits: [{ fields: { 'example.value': [25, 25, 25] } }],
          },
        },
      },
    };
    testAgg(row, { id: 'test', type: 'top_hit', agg_with: 'avg', field: 'example.value' }, 25);
    testAgg(row, { id: 'test', type: 'top_hit', agg_with: 'sum', field: 'example.value' }, 75);
    testAgg(row, { id: 'test', type: 'top_hit', agg_with: 'max', field: 'example.value' }, 25);
    testAgg(row, { id: 'test', type: 'top_hit', agg_with: 'min', field: 'example.value' }, 25);
  });

  const basicWithDerv = {
    key_as_string: '2015/02/01 00:00:00',
    key: 1422748800000,
    doc_count: 2,
    test: {
      value: 60.0,
    },
    test_deriv: {
      value: -490.0,
      normalized_value: -15.806451612903226,
    },
  };

  describe('count', () => {
    testAgg(basicWithDerv, { id: 'test', type: 'count' }, 2);
  });

  describe('derivative', () => {
    testAgg(basicWithDerv, { id: 'test_deriv', type: 'derivative' }, -15.806451612903226);
  });

  describe('basic metric', () => {
    testAgg(basicWithDerv, { id: 'test', type: 'avg' }, 60.0);
  });
});
