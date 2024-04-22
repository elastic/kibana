/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
            "type": "date",
          },
          "agent.keyword": Object {
            "esType": "keyword",
            "type": "string",
          },
          "bytes": Object {
            "type": "number",
          },
        }
      `);
    });
  });
});
