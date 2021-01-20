/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../test_helpers';
import { aggFilters } from './filters_fn';

describe('agg_expression_functions', () => {
  describe('aggFilters', () => {
    const fn = functionWrapper(aggFilters());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({});
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "filters": undefined,
              "json": undefined,
            },
            "schema": undefined,
            "type": "filters",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        filters: JSON.stringify([
          {
            query: 'query',
            language: 'lucene',
            label: 'test',
          },
        ]),
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "filters": Array [
              Object {
                "label": "test",
                "language": "lucene",
                "query": "query",
              },
            ],
            "json": undefined,
          },
          "schema": undefined,
          "type": "filters",
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
