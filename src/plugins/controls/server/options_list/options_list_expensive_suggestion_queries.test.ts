/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import { getExpensiveSuggestionAggregationBuilder } from './options_list_expensive_suggestion_queries';
import { OptionsListRequestBody } from '../../common/options_list/types';

describe('options list expensive queries', () => {
  let rawSearchResponseMock: SearchResponse = {} as SearchResponse;

  beforeEach(() => {
    rawSearchResponseMock = {
      hits: {
        total: 10,
        max_score: 10,
        hits: [],
      },
      took: 10,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 1,
        total: 1,
        skipped: 0,
      },
      aggregations: {},
    };
  });

  describe('suggestion aggregation', () => {
    describe('string (keyword, text+keyword, or nested) field', () => {
      test('test keyword field, without a search string', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          allowExpensiveQueries: true,
          fieldName: 'coolTestField.keyword',
          sort: { by: '_key', direction: 'asc' },
          fieldSpec: { aggregatable: true } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "suggestions": Object {
              "terms": Object {
                "field": "coolTestField.keyword",
                "order": Object {
                  "_key": "asc",
                },
                "shard_size": 10,
                "size": 10,
              },
            },
            "unique_terms": Object {
              "cardinality": Object {
                "field": "coolTestField.keyword",
              },
            },
          }
        `);
      });

      test('test keyword field, with a search string', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          searchString: 'cooool',
          allowExpensiveQueries: true,
          fieldName: 'coolTestField.keyword',
          sort: { by: '_key', direction: 'desc' },
          fieldSpec: { aggregatable: true } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "filteredSuggestions": Object {
              "aggs": Object {
                "suggestions": Object {
                  "terms": Object {
                    "field": "coolTestField.keyword",
                    "order": Object {
                      "_key": "desc",
                    },
                    "shard_size": 10,
                    "size": 10,
                  },
                },
                "unique_terms": Object {
                  "cardinality": Object {
                    "field": "coolTestField.keyword",
                  },
                },
              },
              "filter": Object {
                "prefix": Object {
                  "coolTestField.keyword": Object {
                    "case_insensitive": true,
                    "value": "cooool",
                  },
                },
              },
            },
          }
        `);
      });

      test('test nested field, with a search string', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          searchString: 'cooool',
          allowExpensiveQueries: true,
          fieldName: 'coolNestedField',
          sort: { by: '_count', direction: 'asc' },
          fieldSpec: { subType: { nested: { path: 'path.to.nested' } } } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "nestedSuggestions": Object {
              "aggs": Object {
                "filteredSuggestions": Object {
                  "aggs": Object {
                    "suggestions": Object {
                      "terms": Object {
                        "field": "coolNestedField",
                        "order": Object {
                          "_count": "asc",
                        },
                        "shard_size": 10,
                        "size": 10,
                      },
                    },
                    "unique_terms": Object {
                      "cardinality": Object {
                        "field": "coolNestedField",
                      },
                    },
                  },
                  "filter": Object {
                    "prefix": Object {
                      "coolNestedField": Object {
                        "case_insensitive": true,
                        "value": "cooool",
                      },
                    },
                  },
                },
              },
              "nested": Object {
                "path": "path.to.nested",
              },
            },
          }
          `);
      });
    });

    test('boolean field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'coolean',
        allowExpensiveQueries: false,
        sort: { by: '_key', direction: 'desc' },
        fieldSpec: { type: 'boolean' } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
        optionsListRequestBodyMock
      );
      expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "suggestions": Object {
            "terms": Object {
              "field": "coolean",
              "order": Object {
                "_key": "desc",
              },
              "shard_size": 10,
            },
          },
        }
      `);
    });

    describe('IP field', () => {
      test('without a search string, creates IP range aggregation with default range', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          fieldName: 'clientip',
          allowExpensiveQueries: true,
          sort: { by: '_key', direction: 'asc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "suggestions": Object {
              "aggs": Object {
                "filteredSuggestions": Object {
                  "terms": Object {
                    "field": "clientip",
                    "order": Object {
                      "_key": "asc",
                    },
                    "shard_size": 10,
                    "size": 10,
                  },
                },
                "unique_terms": Object {
                  "cardinality": Object {
                    "field": "clientip",
                  },
                },
              },
              "ip_range": Object {
                "field": "clientip",
                "keyed": true,
                "ranges": Array [
                  Object {
                    "from": "::",
                    "key": "ipv6",
                    "to": "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
                  },
                ],
              },
            },
          }
        `);
      });

      test('full IPv4 in the search string, creates IP range aggregation with CIDR mask', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          fieldName: 'clientip',
          allowExpensiveQueries: true,
          searchString: '41.77.243.255',
          sort: { by: '_count', direction: 'asc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "suggestions": Object {
              "aggs": Object {
                "filteredSuggestions": Object {
                  "terms": Object {
                    "field": "clientip",
                    "order": Object {
                      "_count": "asc",
                    },
                    "shard_size": 10,
                    "size": 10,
                  },
                },
                "unique_terms": Object {
                  "cardinality": Object {
                    "field": "clientip",
                  },
                },
              },
              "ip_range": Object {
                "field": "clientip",
                "keyed": true,
                "ranges": Array [
                  Object {
                    "key": "ipv4",
                    "mask": "41.77.243.255/32",
                  },
                ],
              },
            },
          }
        `);
      });

      test('full IPv6 in the search string, creates IP range aggregation with CIDR mask', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          fieldName: 'clientip',
          allowExpensiveQueries: true,
          sort: { by: '_key', direction: 'asc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
          searchString: 'f688:fb50:6433:bba2:604:f2c:194a:d3c5',
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "suggestions": Object {
              "aggs": Object {
                "filteredSuggestions": Object {
                  "terms": Object {
                    "field": "clientip",
                    "order": Object {
                      "_key": "asc",
                    },
                    "shard_size": 10,
                    "size": 10,
                  },
                },
                "unique_terms": Object {
                  "cardinality": Object {
                    "field": "clientip",
                  },
                },
              },
              "ip_range": Object {
                "field": "clientip",
                "keyed": true,
                "ranges": Array [
                  Object {
                    "key": "ipv6",
                    "mask": "f688:fb50:6433:bba2:604:f2c:194a:d3c5/128",
                  },
                ],
              },
            },
          }
        `);
      });

      test('partial IPv4 in the search string, creates IP range aggregation with min and max', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          fieldName: 'clientip',
          searchString: '41.77',
          allowExpensiveQueries: true,
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "suggestions": Object {
              "aggs": Object {
                "filteredSuggestions": Object {
                  "terms": Object {
                    "field": "clientip",
                    "order": Object {
                      "_count": "desc",
                    },
                    "shard_size": 10,
                    "size": 10,
                  },
                },
                "unique_terms": Object {
                  "cardinality": Object {
                    "field": "clientip",
                  },
                },
              },
              "ip_range": Object {
                "field": "clientip",
                "keyed": true,
                "ranges": Array [
                  Object {
                    "from": "41.77.0.0",
                    "key": "ipv4",
                    "to": "41.77.255.255",
                  },
                ],
              },
            },
          }
        `);
      });

      test('partial IPv46 in the search string, creates IP range aggregation with min and max', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          fieldName: 'clientip',
          searchString: 'cdb6:',
          allowExpensiveQueries: true,
          sort: { by: '_count', direction: 'desc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "suggestions": Object {
              "aggs": Object {
                "filteredSuggestions": Object {
                  "terms": Object {
                    "field": "clientip",
                    "order": Object {
                      "_count": "desc",
                    },
                    "shard_size": 10,
                    "size": 10,
                  },
                },
                "unique_terms": Object {
                  "cardinality": Object {
                    "field": "clientip",
                  },
                },
              },
              "ip_range": Object {
                "field": "clientip",
                "keyed": true,
                "ranges": Array [
                  Object {
                    "from": "cdb6::",
                    "key": "ipv6",
                    "to": "cdb6:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
                  },
                ],
              },
            },
          }
        `);
      });
    });
  });

  describe('suggestion parsing', () => {
    test('parses string (keyword, text+keyword, or nested) result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        allowExpensiveQueries: true,
        fieldName: 'coolTestField.keyword',
        fieldSpec: { aggregatable: true } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
        optionsListRequestBodyMock
      );
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: [
            { doc_count: 5, key: 'cool1' },
            { doc_count: 15, key: 'cool2' },
            { doc_count: 10, key: 'cool3' },
          ],
        },
        unique_terms: {
          value: 3,
        },
      };
      expect(suggestionAggBuilder.parse(rawSearchResponseMock, optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "suggestions": Array [
            Object {
              "docCount": 5,
              "value": "cool1",
            },
            Object {
              "docCount": 15,
              "value": "cool2",
            },
            Object {
              "docCount": 10,
              "value": "cool3",
            },
          ],
          "totalCardinality": 3,
        }
      `);
    });

    test('parses boolean result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'coolean',
        allowExpensiveQueries: true,
        fieldSpec: { type: 'boolean' } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
        optionsListRequestBodyMock
      );
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: [
            { doc_count: 55, key_as_string: 'false' },
            { doc_count: 155, key_as_string: 'true' },
          ],
        },
      };
      expect(suggestionAggBuilder.parse(rawSearchResponseMock, optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "suggestions": Array [
            Object {
              "docCount": 55,
              "value": "false",
            },
            Object {
              "docCount": 155,
              "value": "true",
            },
          ],
          "totalCardinality": 2,
        }
      `);
    });

    test('parses nested result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        searchString: 'co',
        fieldName: 'coolNestedField',
        allowExpensiveQueries: true,
        fieldSpec: { subType: { nested: { path: 'path.to.nested' } } } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
        optionsListRequestBodyMock
      );
      rawSearchResponseMock.aggregations = {
        nestedSuggestions: {
          filteredSuggestions: {
            suggestions: {
              buckets: [
                { doc_count: 5, key: 'cool1' },
                { doc_count: 15, key: 'cool2' },
                { doc_count: 10, key: 'cool3' },
              ],
            },
            unique_terms: {
              value: 3,
            },
          },
        },
      };
      expect(suggestionAggBuilder.parse(rawSearchResponseMock, optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "suggestions": Array [
            Object {
              "docCount": 5,
              "value": "cool1",
            },
            Object {
              "docCount": 15,
              "value": "cool2",
            },
            Object {
              "docCount": 10,
              "value": "cool3",
            },
          ],
          "totalCardinality": 3,
        }
      `);
    });

    test('parses mixed IPv4 and IPv6 result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'clientip',
        allowExpensiveQueries: true,
        fieldSpec: { type: 'ip' } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getExpensiveSuggestionAggregationBuilder(
        optionsListRequestBodyMock
      );
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: {
            ipv4: {
              from: '0.0.0.0',
              to: '255.255.255.255',
              filteredSuggestions: {
                buckets: [
                  { doc_count: 8, key: '21.35.91.62' },
                  { doc_count: 8, key: '21.35.91.61' },
                  { doc_count: 11, key: '111.52.174.2' },
                  { doc_count: 1, key: '56.73.58.63' },
                  { doc_count: 9, key: '23.216.241.120' },
                  { doc_count: 10, key: '196.162.13.39' },
                  { doc_count: 7, key: '203.88.33.151' },
                ],
              },
            },
            ipv6: {
              from: '::',
              to: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
              filteredSuggestions: {
                buckets: [
                  { doc_count: 12, key: '52:ae76:5947:5e2a:551:fe6a:712a:c72' },
                  { doc_count: 1, key: 'fd:4aa0:c27c:b04:997f:2de1:51b4:8418' },
                  { doc_count: 9, key: '28c7:c9a4:42fd:16b0:4de5:e41e:28d9:9172' },
                  { doc_count: 6, key: '1ec:aa98:b0a6:d07c:590:18a0:8a33:2eb8' },
                  { doc_count: 10, key: 'f7a9:640b:b5a0:1219:8d75:ed94:3c3e:2e63' },
                ],
              },
            },
          },
        },
        unique_terms: {
          buckets: {
            ipv4: {
              value: 7,
            },
            ipv6: {
              value: 5,
            },
          },
        },
      };

      const parsed = suggestionAggBuilder.parse(
        rawSearchResponseMock,
        optionsListRequestBodyMock
      ).suggestions;

      expect(parsed).toMatchInlineSnapshot(`
        Array [
          Object {
            "docCount": 12,
            "value": "52:ae76:5947:5e2a:551:fe6a:712a:c72",
          },
          Object {
            "docCount": 11,
            "value": "111.52.174.2",
          },
          Object {
            "docCount": 10,
            "value": "196.162.13.39",
          },
          Object {
            "docCount": 10,
            "value": "f7a9:640b:b5a0:1219:8d75:ed94:3c3e:2e63",
          },
          Object {
            "docCount": 9,
            "value": "23.216.241.120",
          },
          Object {
            "docCount": 9,
            "value": "28c7:c9a4:42fd:16b0:4de5:e41e:28d9:9172",
          },
          Object {
            "docCount": 8,
            "value": "21.35.91.62",
          },
          Object {
            "docCount": 8,
            "value": "21.35.91.61",
          },
          Object {
            "docCount": 7,
            "value": "203.88.33.151",
          },
          Object {
            "docCount": 6,
            "value": "1ec:aa98:b0a6:d07c:590:18a0:8a33:2eb8",
          },
        ]
      `);
    });
  });
});
