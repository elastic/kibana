/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggMovingAvg } from './moving_avg_fn';

describe('agg_expression_functions', () => {
  describe('aggMovingAvg', () => {
    const fn = functionWrapper(aggMovingAvg());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        buckets_path: 'the_sum',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "buckets_path": "the_sum",
              "customLabel": undefined,
              "customMetric": undefined,
              "json": undefined,
              "metricAgg": undefined,
              "script": undefined,
              "window": undefined,
            },
            "schema": undefined,
            "type": "moving_avg",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        buckets_path: 'the_sum',
        metricAgg: 'sum',
        window: 10,
        script: 'test',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "buckets_path": "the_sum",
              "customLabel": undefined,
              "customMetric": undefined,
              "json": undefined,
              "metricAgg": "sum",
              "script": "test",
              "window": 10,
            },
            "schema": undefined,
            "type": "moving_avg",
          },
        }
      `);
    });

    test('handles customMetric as a subexpression', () => {
      const actual = fn({
        customMetric: fn({ buckets_path: 'the_sum' }),
        buckets_path: 'the_sum',
      });

      expect(actual.value.params).toMatchInlineSnapshot(`
        Object {
          "buckets_path": "the_sum",
          "customLabel": undefined,
          "customMetric": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "buckets_path": "the_sum",
              "customLabel": undefined,
              "customMetric": undefined,
              "json": undefined,
              "metricAgg": undefined,
              "script": undefined,
              "window": undefined,
            },
            "schema": undefined,
            "type": "moving_avg",
          },
          "json": undefined,
          "metricAgg": undefined,
          "script": undefined,
          "window": undefined,
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        json: '{ "foo": true }',
        buckets_path: 'the_sum',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
