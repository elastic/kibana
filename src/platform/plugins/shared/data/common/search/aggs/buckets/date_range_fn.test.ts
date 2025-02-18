/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from '../test_helpers';
import { aggDateRange } from './date_range_fn';

describe('agg_expression_functions', () => {
  describe('aggDateRange', () => {
    const fn = functionWrapper(aggDateRange());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({});
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "field": undefined,
              "json": undefined,
              "ranges": undefined,
              "time_zone": undefined,
            },
            "schema": undefined,
            "type": "date_range",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'date_field',
        time_zone: 'UTC +3',
        ranges: [
          { from: 'now-1w/w', to: 'now', type: 'date_range' },
          { from: 1588163532470, to: 1588163532481, type: 'date_range' },
        ],
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "field": "date_field",
            "json": undefined,
            "ranges": Array [
              Object {
                "from": "now-1w/w",
                "to": "now",
              },
              Object {
                "from": 1588163532470,
                "to": 1588163532481,
              },
            ],
            "time_zone": "UTC +3",
          },
          "schema": undefined,
          "type": "date_range",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'date_field',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
