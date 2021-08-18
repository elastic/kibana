/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggGeoHash } from './geo_hash_fn';

describe('agg_expression_functions', () => {
  describe('aggGeoHash', () => {
    const fn = functionWrapper(aggGeoHash());

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
              "autoPrecision": undefined,
              "boundingBox": undefined,
              "customLabel": undefined,
              "field": "geo_field",
              "isFilteredByCollar": undefined,
              "json": undefined,
              "precision": undefined,
              "useGeocentroid": undefined,
            },
            "schema": undefined,
            "type": "geohash_grid",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'geo_field',
        autoPrecision: false,
        precision: 10,
        useGeocentroid: true,
        isFilteredByCollar: false,
        boundingBox: {
          type: 'geo_bounding_box',
          top_left: [-74.1, 40.73],
          bottom_right: [-71.12, 40.01],
        },
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "autoPrecision": false,
            "boundingBox": Object {
              "bottom_right": Array [
                -71.12,
                40.01,
              ],
              "top_left": Array [
                -74.1,
                40.73,
              ],
            },
            "customLabel": undefined,
            "field": "geo_field",
            "isFilteredByCollar": false,
            "json": undefined,
            "precision": 10,
            "useGeocentroid": true,
          },
          "schema": undefined,
          "type": "geohash_grid",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        field: 'geo_field',
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
