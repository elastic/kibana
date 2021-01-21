/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggBucketMax } from './bucket_max_fn';

describe('agg_expression_functions', () => {
  describe('aggBucketMax', () => {
    const fn = functionWrapper(aggBucketMax());

    test('handles customMetric and customBucket as a subexpression', () => {
      const actual = fn({
        customMetric: fn({}),
        customBucket: fn({}),
      });

      expect(actual.value.params).toMatchInlineSnapshot(`
        Object {
          "customBucket": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customBucket": undefined,
              "customLabel": undefined,
              "customMetric": undefined,
              "json": undefined,
            },
            "schema": undefined,
            "type": "max_bucket",
          },
          "customLabel": undefined,
          "customMetric": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customBucket": undefined,
              "customLabel": undefined,
              "customMetric": undefined,
              "json": undefined,
            },
            "schema": undefined,
            "type": "max_bucket",
          },
          "json": undefined,
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
