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
              "isIpv6": false,
              "json": undefined,
              "prefixLength": undefined,
              "prefixLength64": undefined,
            },
            "schema": undefined,
            "type": "ip_prefix",
          },
        }
      `);
    });

    test('includes filled in params when they are provided - ipv4', () => {
      const actual = fn({
        field: 'ip_field',
        isIpv6: false,
        prefixLength: 8,
        prefixLength64: 56,
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "field": "ip_field",
            "isIpv6": false,
            "json": undefined,
            "prefixLength": 8,
            "prefixLength64": 56,
          },
          "schema": undefined,
          "type": "ip_prefix",
        }
      `);
    });

    test('includes filled in params when they are provided - ipv6', () => {
      const actual = fn({
        field: 'ip_field',
        isIpv6: true,
        prefixLength: 8,
        prefixLength64: 56,
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "field": "ip_field",
            "isIpv6": true,
            "json": undefined,
            "prefixLength": 8,
            "prefixLength64": 56,
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
