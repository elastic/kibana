/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggIpPrefix } from './ip_prefix_fn';

describe('agg_expression_functions', () => {
  describe('aggIpPrefix', () => {
    const fn = functionWrapper(aggIpPrefix());

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
              "ipPrefix": undefined,
              "json": undefined,
            },
            "schema": undefined,
            "type": "ip_prefix",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'ip_field',
        ipPrefix: { prefixLength: 1, isIpv6: false, type: 'ip_prefix' },
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "field": "ip_field",
            "ipPrefix": Object {
              "isIpv6": false,
              "prefixLength": 1,
              "type": "ip_prefix",
            },
            "json": undefined,
          },
          "schema": undefined,
          "type": "ip_prefix",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'ip_field',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
