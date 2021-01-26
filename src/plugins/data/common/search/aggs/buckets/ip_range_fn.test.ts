/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { IP_RANGE_TYPES } from './ip_range';
import { aggIpRange } from './ip_range_fn';

describe('agg_expression_functions', () => {
  describe('aggIpRange', () => {
    const fn = functionWrapper(aggIpRange());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'ip_field',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "field": "ip_field",
              "ipRangeType": undefined,
              "json": undefined,
              "ranges": undefined,
            },
            "schema": undefined,
            "type": "ip_range",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'ip_field',
        ipRangeType: IP_RANGE_TYPES.MASK,
        ranges: JSON.stringify({
          mask: [{ mask: '10.0.0.0/25' }],
        }),
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "field": "ip_field",
            "ipRangeType": "mask",
            "json": undefined,
            "ranges": Object {
              "mask": Array [
                Object {
                  "mask": "10.0.0.0/25",
                },
              ],
            },
          },
          "schema": undefined,
          "type": "ip_range",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'ip_field',
        ipRangeType: IP_RANGE_TYPES.MASK,
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
