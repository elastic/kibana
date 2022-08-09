/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFilterByPath } from './filters_builder_utils';

import { getFiltersMock } from './__mock__/filters';
describe('filters_builder_utils', () => {
  describe('getFilterByPath', () => {
    const filters = getFiltersMock();

    test('should return correct filterByPath', () => {
      expect(getFilterByPath(filters, '0')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 1",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 1",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '2')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 6",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 6",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '1.2')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 5",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 5",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '1.1.1')).toMatchInlineSnapshot(`
        Object {
          "$state": Object {
            "store": "appState",
          },
          "meta": Object {
            "alias": null,
            "disabled": false,
            "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "key": "category.keyword",
            "negate": false,
            "params": Object {
              "query": "Men's Accessories 4",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "category.keyword": "Men's Accessories 4",
            },
          },
        }
      `);
      expect(getFilterByPath(filters, '1.1')).toMatchInlineSnapshot(`
        Array [
          Object {
            "$state": Object {
              "store": "appState",
            },
            "meta": Object {
              "alias": null,
              "disabled": false,
              "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
              "key": "category.keyword",
              "negate": false,
              "params": Object {
                "query": "Men's Accessories 3",
              },
              "type": "phrase",
            },
            "query": Object {
              "match_phrase": Object {
                "category.keyword": "Men's Accessories 3",
              },
            },
          },
          Object {
            "$state": Object {
              "store": "appState",
            },
            "meta": Object {
              "alias": null,
              "disabled": false,
              "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
              "key": "category.keyword",
              "negate": false,
              "params": Object {
                "query": "Men's Accessories 4",
              },
              "type": "phrase",
            },
            "query": Object {
              "match_phrase": Object {
                "category.keyword": "Men's Accessories 4",
              },
            },
          },
        ]
      `);
    });
  });
});
