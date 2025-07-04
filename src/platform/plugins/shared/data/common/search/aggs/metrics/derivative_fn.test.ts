/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from '../test_helpers';
import { aggDerivative } from './derivative_fn';

describe('agg_expression_functions', () => {
  describe('aggDerivative', () => {
    const fn = functionWrapper(aggDerivative());

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
              "timeShift": undefined,
            },
            "schema": undefined,
            "type": "derivative",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        buckets_path: 'the_sum',
        metricAgg: 'sum',
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
              "timeShift": undefined,
            },
            "schema": undefined,
            "type": "derivative",
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
              "timeShift": undefined,
            },
            "schema": undefined,
            "type": "derivative",
          },
          "json": undefined,
          "metricAgg": undefined,
          "timeShift": undefined,
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
