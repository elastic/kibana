/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
              "filter": undefined,
              "geo_bounding_box": undefined,
              "json": undefined,
              "timeShift": undefined,
              "timeWindow": undefined,
            },
            "schema": undefined,
            "type": "filter",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        geo_bounding_box: {
          type: 'geo_bounding_box',
          wkt: 'BBOX (-74.1, -71.12, 40.73, 40.01)',
        },
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "filter": undefined,
            "geo_bounding_box": Object {
              "wkt": "BBOX (-74.1, -71.12, 40.73, 40.01)",
            },
            "json": undefined,
            "timeShift": undefined,
            "timeWindow": undefined,
          },
          "schema": undefined,
          "type": "filter",
        }
      `);
    });

    test('correctly parses filter string argument', () => {
      const actual = fn({
        filter: { type: 'kibana_query', language: 'kuery', query: 'a: b' },
      });

      expect(actual.value.params.filter).toEqual(
        expect.objectContaining({ language: 'kuery', query: 'a: b' })
      );
    });

    test('errors out if geo_bounding_box is used together with filter', () => {
      expect(() =>
        fn({
          filter: { type: 'kibana_query', language: 'kuery', query: 'a: b' },
          geo_bounding_box: {
            type: 'geo_bounding_box',
            wkt: 'BBOX (-74.1, -71.12, 40.73, 40.01)',
          },
        })
      ).toThrow();
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
