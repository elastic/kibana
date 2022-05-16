/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { addFiltersToQuery } from './helpers';

describe('addFiltersToQuery', () => {
  it('updates the provided ES query by appending the desired filters to it', () => {
    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must_not: {
          term: {
            foo: 'bar',
          },
        },
      },
    };
    const filter: estypes.QueryDslQueryContainer = {
      bool: {
        must_not: {
          term: {
            baz: 'qux',
          },
        },
      },
    };

    expect(addFiltersToQuery(query, filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "must_not": Object {
                  "term": Object {
                    "foo": "bar",
                  },
                },
              },
            },
            Object {
              "bool": Object {
                "must_not": Object {
                  "term": Object {
                    "baz": "qux",
                  },
                },
              },
            },
          ],
        },
      }
    `);
  });
});
