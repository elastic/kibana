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
import { aggHistogram } from './histogram_fn';

describe('agg_expression_functions', () => {
  describe('aggHistogram', () => {
    const fn = functionWrapper(aggHistogram());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'field',
        interval: '10',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "extended_bounds": undefined,
              "field": "field",
              "has_extended_bounds": undefined,
              "interval": "10",
              "intervalBase": undefined,
              "json": undefined,
              "maxBars": undefined,
              "min_doc_count": undefined,
            },
            "schema": undefined,
            "type": "histogram",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'field',
        interval: 'auto',
        intervalBase: 1,
        maxBars: 25,
        min_doc_count: false,
        has_extended_bounds: false,
        extended_bounds: JSON.stringify({
          min: 1,
          max: 2,
        }),
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "extended_bounds": Object {
              "max": 2,
              "min": 1,
            },
            "field": "field",
            "has_extended_bounds": false,
            "interval": "auto",
            "intervalBase": 1,
            "json": undefined,
            "maxBars": 25,
            "min_doc_count": false,
          },
          "schema": undefined,
          "type": "histogram",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'field',
        interval: '10',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual({ foo: true });

      expect(() => {
        fn({
          field: 'field',
          interval: '10',
          json: '/// intentionally malformed json ///',
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Unable to parse json argument string"`);
    });
  });
});
