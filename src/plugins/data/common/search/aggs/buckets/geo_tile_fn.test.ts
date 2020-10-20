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
import { aggGeoTile } from './geo_tile_fn';

describe('agg_expression_functions', () => {
  describe('aggGeoTile', () => {
    const fn = functionWrapper(aggGeoTile());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({
        field: 'geo_field',
      });
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "field": "geo_field",
              "json": undefined,
              "precision": undefined,
              "useGeocentroid": undefined,
            },
            "schema": undefined,
            "type": "geotile_grid",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'geo_field',
        useGeocentroid: false,
        precision: 10,
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "field": "geo_field",
            "json": undefined,
            "precision": 10,
            "useGeocentroid": false,
          },
          "schema": undefined,
          "type": "geotile_grid",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'geo_field',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual({ foo: true });

      expect(() => {
        fn({
          field: 'geo_field',
          json: '/// intentionally malformed json ///',
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Unable to parse json argument string"`);
    });
  });
});
