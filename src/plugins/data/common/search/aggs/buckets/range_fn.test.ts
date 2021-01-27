/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggRange } from './range_fn';

describe('agg_expression_functions', () => {
  describe('aggRange', () => {
    const fn = functionWrapper(aggRange());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'number_field',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "field": "number_field",
              "json": undefined,
              "ranges": undefined,
            },
            "schema": undefined,
            "type": "range",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'number_field',
        ranges: JSON.stringify([
          { from: 1, to: 2 },
          { from: 5, to: 100 },
        ]),
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "field": "number_field",
            "json": undefined,
            "ranges": Array [
              Object {
                "from": 1,
                "to": 2,
              },
              Object {
                "from": 5,
                "to": 100,
              },
            ],
          },
          "schema": undefined,
          "type": "range",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'number_field',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
