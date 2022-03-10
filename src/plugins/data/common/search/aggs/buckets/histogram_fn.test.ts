/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
              "autoExtendBounds": undefined,
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
        autoExtendBounds: true,
        extended_bounds: {
          type: 'extended_bounds',
          min: 1,
          max: 2,
        },
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "autoExtendBounds": true,
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

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
