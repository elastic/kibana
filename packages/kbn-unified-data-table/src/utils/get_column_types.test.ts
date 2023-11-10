/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTextBasedColumnTypes } from './get_column_types';

describe('getColumnTypes', () => {
  describe('getTextBasedColumnTypes', () => {
    test('returns a correct column types map', async () => {
      const result = getTextBasedColumnTypes([
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
          "@timestamp": "date",
          "agent.keyword": "string",
          "bytes": "number",
        }
      `);
    });
  });
});
