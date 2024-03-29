/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggTopMetrics } from './top_metrics_fn';

describe('agg_expression_functions', () => {
  describe('aggTopMetrics', () => {
    const fn = functionWrapper(aggTopMetrics());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'machine.os.keyword',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "field": "machine.os.keyword",
              "json": undefined,
              "size": undefined,
              "sortField": undefined,
              "sortOrder": undefined,
            },
            "schema": undefined,
            "type": "top_metrics",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        id: '1',
        enabled: false,
        schema: 'whatever',
        field: 'machine.os.keyword',
        sortOrder: 'asc',
        size: 6,
        sortField: 'bytes',
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": false,
          "id": "1",
          "params": Object {
            "customLabel": undefined,
            "field": "machine.os.keyword",
            "json": undefined,
            "size": 6,
            "sortField": "bytes",
            "sortOrder": "asc",
          },
          "schema": "whatever",
          "type": "top_metrics",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'machine.os.keyword',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
