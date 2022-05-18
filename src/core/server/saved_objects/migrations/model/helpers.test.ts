/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { addMustNotClausesToQuery } from './helpers';

describe('addMustNotClausesToQuery', () => {
  it('creates a valid query object if the existing query was not defined', () => {
    const query: QueryDslQueryContainer = {};
    const mustNotClauses = [{ term: { type: 'bar' } }, { term: { type: 'baz' } }];

    expect(addMustNotClausesToQuery(query, mustNotClauses)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Object {
            "bool": Object {
              "must_not": Array [
                Object {
                  "term": Object {
                    "type": "bar",
                  },
                },
                Object {
                  "term": Object {
                    "type": "baz",
                  },
                },
              ],
            },
          },
        },
      }
    `);
  });

  it('adds a new filter bool.filter clause if it did not exist', () => {
    const query: QueryDslQueryContainer = {
      bool: {
        should: [
          { match: { 'name.first': { query: 'shay', _name: 'first' } } },
          { match: { 'name.last': { query: 'banon', _name: 'last' } } },
        ],
      },
    };
    const mustNotClauses = [{ term: { type: 'bar' } }, { term: { type: 'baz' } }];

    expect(addMustNotClausesToQuery(query, mustNotClauses)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Object {
            "bool": Object {
              "must_not": Array [
                Object {
                  "term": Object {
                    "type": "bar",
                  },
                },
                Object {
                  "term": Object {
                    "type": "baz",
                  },
                },
              ],
            },
          },
          "should": Array [
            Object {
              "match": Object {
                "name.first": Object {
                  "_name": "first",
                  "query": "shay",
                },
              },
            },
            Object {
              "match": Object {
                "name.last": Object {
                  "_name": "last",
                  "query": "banon",
                },
              },
            },
          ],
        },
      }
    `);
  });

  it('updates the provided ES query by appending new term clauses to the existing bool.filter.bool.must_not', () => {
    const query: QueryDslQueryContainer = {
      bool: {
        filter: {
          bool: {
            must_not: {
              term: {
                type: 'foo',
              },
            },
          },
        },
      },
    };
    const mustNotClauses = [{ term: { type: 'bar' } }, { term: { type: 'baz' } }];

    expect(addMustNotClausesToQuery(query, mustNotClauses)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Object {
            "bool": Object {
              "must_not": Array [
                Object {
                  "term": Object {
                    "type": "foo",
                  },
                },
                Object {
                  "term": Object {
                    "type": "bar",
                  },
                },
                Object {
                  "term": Object {
                    "type": "baz",
                  },
                },
              ],
            },
          },
        },
      }
    `);
  });

  it('appends a new must_not clause to the existing filter, if it is an array', () => {
    const query: QueryDslQueryContainer = {
      bool: {
        filter: [
          {
            bool: {
              must_not: {
                term: {
                  type: 'foo',
                },
              },
            },
          },
        ],
      },
    };
    const mustNotClauses = [{ term: { type: 'bar' } }, { term: { type: 'baz' } }];

    expect(addMustNotClausesToQuery(query, mustNotClauses)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "must_not": Object {
                  "term": Object {
                    "type": "foo",
                  },
                },
              },
            },
            Object {
              "bool": Object {
                "must_not": Array [
                  Object {
                    "term": Object {
                      "type": "bar",
                    },
                  },
                  Object {
                    "term": Object {
                      "type": "baz",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
  });

  it('appends elements to the existing bool.filter.bool.must_not, if it is an array', () => {
    const query: QueryDslQueryContainer = {
      bool: {
        filter: {
          bool: {
            must_not: [
              {
                term: {
                  type: 'foo',
                },
              },
              {
                bool: {
                  must: [
                    {
                      match: {
                        type: 'search-session',
                      },
                    },
                    {
                      match: {
                        'search-session.persisted': false,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    };
    const mustNotClauses = [{ term: { type: 'bar' } }, { term: { type: 'baz' } }];

    expect(addMustNotClausesToQuery(query, mustNotClauses)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Object {
            "bool": Object {
              "must_not": Array [
                Object {
                  "term": Object {
                    "type": "foo",
                  },
                },
                Object {
                  "bool": Object {
                    "must": Array [
                      Object {
                        "match": Object {
                          "type": "search-session",
                        },
                      },
                      Object {
                        "match": Object {
                          "search-session.persisted": false,
                        },
                      },
                    ],
                  },
                },
                Object {
                  "term": Object {
                    "type": "bar",
                  },
                },
                Object {
                  "term": Object {
                    "type": "baz",
                  },
                },
              ],
            },
          },
        },
      }
    `);
  });

  it('preserves other query properties', () => {
    const query: QueryDslQueryContainer = {
      bool: {
        filter: {
          bool: {
            must: [
              { match: { 'name.first': { query: 'shay', _name: 'first' } } },
              { match: { 'name.last': { query: 'banon', _name: 'last' } } },
            ],
          },
        },
      },
    };
    const mustNotClauses = [{ term: { type: 'baz' } }, { term: { type: 'qux' } }];

    expect(addMustNotClausesToQuery(query, mustNotClauses)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Object {
            "bool": Object {
              "must": Array [
                Object {
                  "match": Object {
                    "name.first": Object {
                      "_name": "first",
                      "query": "shay",
                    },
                  },
                },
                Object {
                  "match": Object {
                    "name.last": Object {
                      "_name": "last",
                      "query": "banon",
                    },
                  },
                },
              ],
              "must_not": Array [
                Object {
                  "term": Object {
                    "type": "baz",
                  },
                },
                Object {
                  "term": Object {
                    "type": "qux",
                  },
                },
              ],
            },
          },
        },
      }
    `);
  });
});
