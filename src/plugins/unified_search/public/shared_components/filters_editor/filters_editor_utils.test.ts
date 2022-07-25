/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFilterByPath } from './filters_editor_utils';

import { getFiltersMock } from './__mock__/filters';
describe('filters_editor_utils', () => {
  describe('getFilterByPath', () => {
    const filters = getFiltersMock();

    test('should return correct filterByPath', () => {
      expect(getFilterByPath(filters, '0')).toMatchInlineSnapshot(`
        Object {
          "meta": Object {
            "index": "1234",
            "key": "category.keyword",
            "params": Object {
              "query": "Filter 1",
            },
            "type": "phrase",
          },
        }
      `);
      expect(getFilterByPath(filters, '2')).toMatchInlineSnapshot(`
        Object {
          "meta": Object {
            "index": "1234",
            "key": "category.keyword",
            "params": Object {
              "query": "Filter 4",
            },
            "type": "phrase",
          },
        }
      `);
      expect(getFilterByPath(filters, '1.2')).toMatchInlineSnapshot(`
        Object {
          "meta": Object {
            "index": "1234",
            "key": "category.keyword",
            "params": Object {
              "query": "Filter 3",
            },
            "type": "phrase",
          },
        }
      `);
      expect(getFilterByPath(filters, '1.1.1')).toMatchInlineSnapshot(`
        Object {
          "meta": Object {
            "index": "1234",
            "key": "category.keyword",
            "params": Object {
              "query": "Filter 2-2",
            },
            "type": "phrase",
          },
        }
      `);
      expect(getFilterByPath(filters, '1.1')).toMatchInlineSnapshot(`
        Object {
          "meta": Object {
            "params": Object {
              "conditionalType": "and",
              "filters": Array [
                Object {
                  "meta": Object {
                    "index": "1234",
                    "key": "category.keyword",
                    "params": Object {
                      "query": "Filter 2-1",
                    },
                    "type": "phrase",
                  },
                },
                Object {
                  "meta": Object {
                    "index": "1234",
                    "key": "category.keyword",
                    "params": Object {
                      "query": "Filter 2-2",
                    },
                    "type": "phrase",
                  },
                },
              ],
            },
          },
        }
      `);
    });
  });
});
