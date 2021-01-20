/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggFilter } from './filter_fn';

describe('agg_expression_functions', () => {
  describe('aggFilter', () => {
    const fn = functionWrapper(aggFilter());

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
              "geo_bounding_box": undefined,
              "json": undefined,
            },
            "schema": undefined,
            "type": "filter",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        geo_bounding_box: JSON.stringify({
          wkt: 'BBOX (-74.1, -71.12, 40.73, 40.01)',
        }),
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "geo_bounding_box": Object {
              "wkt": "BBOX (-74.1, -71.12, 40.73, 40.01)",
            },
            "json": undefined,
          },
          "schema": undefined,
          "type": "filter",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
