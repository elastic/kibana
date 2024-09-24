/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
        filters: [
          {
            type: 'kibana_query_filter',
            input: {
              query: 'query',
              language: 'lucene',
            },
            label: 'test',
          },
        ],
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "filters": Array [
              Object {
                "input": Object {
                  "language": "lucene",
                  "query": "query",
                },
                "label": "test",
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
