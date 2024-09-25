/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
