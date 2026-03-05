/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTextBasedColumnsMeta } from './get_columns_meta';

describe('getColumnTypes', () => {
  describe('getTextBasedColumnsMeta', () => {
    test('returns a correct column types map', async () => {
      const result = getTextBasedColumnsMeta([
        {
          id: '@timestamp',
          name: '@timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          id: 'agent.keyword',
          name: 'agent.keyword',
          meta: {
            type: 'string',
            esType: 'keyword',
          },
        },
        {
          id: 'bytes',
          name: 'bytes',
          meta: {
            type: 'number',
          },
        },
      ]);
      expect(result).toMatchInlineSnapshot(`
        Object {
          "@timestamp": Object {
            "esType": undefined,
            "isComputedColumn": undefined,
            "type": "date",
          },
          "agent.keyword": Object {
            "esType": "keyword",
            "isComputedColumn": undefined,
            "type": "string",
          },
          "bytes": Object {
            "esType": undefined,
            "isComputedColumn": undefined,
            "type": "number",
          },
        }
      `);
    });

    test('preserves isComputedColumn property', async () => {
      const result = getTextBasedColumnsMeta([
        {
          id: 'category',
          name: 'category',
          meta: { type: 'string', esType: 'keyword' },
          isComputedColumn: false, // Grouping field from BY clause
        },
        {
          id: 'avg_price',
          name: 'avg_price',
          meta: { type: 'number' },
          isComputedColumn: true, // Computed aggregation
        },
      ]);
      expect(result).toEqual({
        category: {
          type: 'string',
          esType: 'keyword',
          isComputedColumn: false,
        },
        avg_price: {
          type: 'number',
          esType: undefined,
          isComputedColumn: true,
        },
      });
    });
  });
});
