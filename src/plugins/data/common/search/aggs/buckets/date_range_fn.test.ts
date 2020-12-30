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
        ranges: JSON.stringify([
          { from: 'now-1w/w', to: 'now' },
          { from: 1588163532470, to: 1588163532481 },
        ]),
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

      expect(actual.value.params.json).toEqual({ foo: true });

      expect(() => {
        fn({
          field: 'date_field',
          json: '/// intentionally malformed json ///',
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Unable to parse json argument string"`);
    });
  });
});
