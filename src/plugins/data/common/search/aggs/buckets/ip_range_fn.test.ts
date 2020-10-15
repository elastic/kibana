/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

      expect(actual.value.params.json).toEqual({ foo: true });

      expect(() => {
        fn({
          field: 'ip_field',
          ipRangeType: IP_RANGE_TYPES.FROM_TO,
          json: '/// intentionally malformed json ///',
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Unable to parse json argument string"`);
    });
  });
});
