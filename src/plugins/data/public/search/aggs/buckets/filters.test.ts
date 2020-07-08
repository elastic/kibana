/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Query } from '../../../../common';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import { getFiltersBucketAgg, FiltersBucketAggDependencies } from './filters';

describe('Filters Agg', () => {
  let aggTypesDependencies: FiltersBucketAggDependencies;

  beforeEach(() => {
    jest.resetAllMocks();
    const { uiSettings } = coreMock.createSetup();

    aggTypesDependencies = { uiSettings };
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
          typesRegistry: mockAggTypesRegistry([getFiltersBucketAgg(aggTypesDependencies)]),
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
                        "field": 200,
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
                                "gt": 500,
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
        aggTypesDependencies.uiSettings.get = (s: any) =>
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
