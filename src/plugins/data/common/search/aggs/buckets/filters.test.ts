/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '../../..';
import { AggConfigs } from '../agg_configs';
import { AggTypesDependencies } from '../agg_types';
import { mockAggTypesRegistry, mockAggTypesDependencies } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';

describe('Filters Agg', () => {
  let aggTypesDependencies: AggTypesDependencies;

  beforeEach(() => {
    jest.resetAllMocks();
    aggTypesDependencies = {
      ...mockAggTypesDependencies,
      getConfig: jest.fn(),
    };
  });

  describe('order agg editor UI', () => {
    const getAggConfigs = (params: Record<string, any> = {}) => {
      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
          find: () => field,
        },
      } as any;

      const field = {
        name: 'field',
        indexPattern,
      };

      return new AggConfigs(
        indexPattern,
        [
          {
            id: 'test',
            params,
            type: BUCKET_TYPES.FILTERS,
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry(aggTypesDependencies),
        }
      );
    };

    const generateFilter = (label: string, language: string, query: Query['query']) => ({
      label,
      input: {
        language,
        query,
      },
    });

    test('produces the expected expression ast', () => {
      const aggConfigs = getAggConfigs({
        filters: [
          generateFilter('a', 'lucene', 'foo'),
          generateFilter('b', 'lucene', 'status:200'),
          generateFilter('c', 'lucene', 'status:[400 TO 499] AND (foo OR bar)'),
        ],
      });
      expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "enabled": Array [
                  true,
                ],
                "filters": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "input": Array [
                            Object {
                              "chain": Array [
                                Object {
                                  "arguments": Object {
                                    "q": Array [
                                      "\\"foo\\"",
                                    ],
                                  },
                                  "function": "lucene",
                                  "type": "function",
                                },
                              ],
                              "type": "expression",
                            },
                          ],
                          "label": Array [
                            "a",
                          ],
                        },
                        "function": "queryFilter",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "input": Array [
                            Object {
                              "chain": Array [
                                Object {
                                  "arguments": Object {
                                    "q": Array [
                                      "\\"status:200\\"",
                                    ],
                                  },
                                  "function": "lucene",
                                  "type": "function",
                                },
                              ],
                              "type": "expression",
                            },
                          ],
                          "label": Array [
                            "b",
                          ],
                        },
                        "function": "queryFilter",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "input": Array [
                            Object {
                              "chain": Array [
                                Object {
                                  "arguments": Object {
                                    "q": Array [
                                      "\\"status:[400 TO 499] AND (foo OR bar)\\"",
                                    ],
                                  },
                                  "function": "lucene",
                                  "type": "function",
                                },
                              ],
                              "type": "expression",
                            },
                          ],
                          "label": Array [
                            "c",
                          ],
                        },
                        "function": "queryFilter",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "id": Array [
                  "test",
                ],
              },
              "function": "aggFilters",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    describe('using Lucene', () => {
      test('works with lucene filters', () => {
        const aggConfigs = getAggConfigs({
          filters: [
            generateFilter('a', 'lucene', 'foo'),
            generateFilter('b', 'lucene', 'status:200'),
            generateFilter('c', 'lucene', 'status:[400 TO 499] AND (foo OR bar)'),
          ],
        });

        const { [BUCKET_TYPES.FILTERS]: params } = aggConfigs.aggs[0].toDsl();
        expect(Object.values(params.filters).map((v: any) => v.bool.must)).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "query_string": Object {
                  "query": "foo",
                },
              },
            ],
            Array [
              Object {
                "query_string": Object {
                  "query": "status:200",
                },
              },
            ],
            Array [
              Object {
                "query_string": Object {
                  "query": "status:[400 TO 499] AND (foo OR bar)",
                },
              },
            ],
          ]
        `);
      });
    });

    describe('using KQL', () => {
      test('works with KQL filters', () => {
        const aggConfigs = getAggConfigs({
          filters: [
            generateFilter('a', 'kuery', 'status:200'),
            generateFilter('b', 'kuery', 'status > 500 and name:hello'),
          ],
        });

        const { [BUCKET_TYPES.FILTERS]: params } = aggConfigs.aggs[0].toDsl();
        expect(Object.values(params.filters).map((v: any) => v.bool.filter)).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "field": "200",
                      },
                    },
                  ],
                },
              },
            ],
            Array [
              Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "should": Array [
                          Object {
                            "range": Object {
                              "field": Object {
                                "gt": "500",
                              },
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "should": Array [
                          Object {
                            "match": Object {
                              "field": "hello",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          ]
        `);
      });

      test('works with KQL wildcards', () => {
        const aggConfigs = getAggConfigs({
          filters: [generateFilter('a', 'kuery', '*'), generateFilter('b', 'kuery', 'foo*')],
        });

        const { [BUCKET_TYPES.FILTERS]: params } = aggConfigs.aggs[0].toDsl();
        expect(Object.values(params.filters).map((v: any) => v.bool.filter)).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "query_string": Object {
                  "query": "*",
                },
              },
            ],
            Array [
              Object {
                "query_string": Object {
                  "query": "foo*",
                },
              },
            ],
          ]
        `);
      });

      test('throws with leading wildcards if not allowed', () => {
        const aggConfigs = getAggConfigs({
          filters: [generateFilter('a', 'kuery', '*foo*')],
        });

        expect(() => {
          aggConfigs.aggs[0].toDsl();
        }).toThrowErrorMatchingInlineSnapshot(`
"Leading wildcards are disabled. See query:allowLeadingWildcards in Advanced Settings.
*foo*
^"
`);
      });

      test('works with leading wildcards if allowed', () => {
        aggTypesDependencies.getConfig = (s: any) =>
          s === 'query:allowLeadingWildcards' ? true : s;

        const aggConfigs = getAggConfigs({
          filters: [generateFilter('a', 'kuery', '*foo*')],
        });

        const { [BUCKET_TYPES.FILTERS]: params } = aggConfigs.aggs[0].toDsl();
        expect(Object.values(params.filters).map((v: any) => v.bool.filter)).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "query_string": Object {
                  "query": "*foo*",
                },
              },
            ],
          ]
        `);
      });
    });
  });
});
