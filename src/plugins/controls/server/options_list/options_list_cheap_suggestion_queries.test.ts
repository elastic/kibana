/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import { getCheapSuggestionAggregationBuilder } from './options_list_cheap_suggestion_queries';
import { OptionsListRequestBody } from '../../common/options_list/types';

describe('options list cheap queries', () => {
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
    describe('keyword or text+keyword field', () => {
      test('without a search string, creates keyword aggregation', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          allowExpensiveQueries: false,
          fieldName: 'coolTestField.keyword',
          sort: { by: '_count', direction: 'asc' },
          fieldSpec: { aggregatable: true } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "suggestions": Object {
              "terms": Object {
                "field": "coolTestField.keyword",
                "include": ".*",
                "order": Object {
                  "_count": "asc",
                },
                "shard_size": 10,
              },
            },
          }
        `);
      });

      test('with a search string, creates case sensitive keyword aggregation', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          searchString: 'cooool',
          allowExpensiveQueries: false,
          fieldName: 'coolTestField.keyword',
          fieldSpec: { aggregatable: true } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(
          optionsListRequestBodyMock
        );
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
            Object {
              "suggestions": Object {
                "terms": Object {
                  "field": "coolTestField.keyword",
                  "include": "cooool.*",
                  "order": Object {
                    "_count": "desc",
                  },
                  "shard_size": 10,
                },
              },
            }
          `);
      });
    });

    test('creates boolean aggregation for boolean field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'coolean',
        allowExpensiveQueries: false,
        sort: { by: '_key', direction: 'desc' },
        fieldSpec: { type: 'boolean' } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(optionsListRequestBodyMock);
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

    test('creates nested aggregation for nested field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        searchString: 'cooool',
        allowExpensiveQueries: false,
        fieldName: 'coolNestedField',
        sort: { by: '_key', direction: 'asc' },
        fieldSpec: { subType: { nested: { path: 'path.to.nested' } } } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(optionsListRequestBodyMock);
      expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "nestedSuggestions": Object {
            "aggs": Object {
              "suggestions": Object {
                "terms": Object {
                  "field": "coolNestedField",
                  "include": "cooool.*",
                  "order": Object {
                    "_key": "asc",
                  },
                  "shard_size": 10,
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

    describe('IP field', () => {
      test('without a search string, creates IP range aggregation with default range', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          size: 10,
          fieldName: 'clientip',
          allowExpensiveQueries: false,
          sort: { by: '_count', direction: 'asc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(
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
          allowExpensiveQueries: false,
          searchString: '41.77.243.255',
          sort: { by: '_key', direction: 'desc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(
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
                      "_key": "desc",
                    },
                    "shard_size": 10,
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
          allowExpensiveQueries: false,
          sort: { by: '_key', direction: 'asc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
          searchString: 'f688:fb50:6433:bba2:604:f2c:194a:d3c5',
        };
        const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(
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
          allowExpensiveQueries: false,
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(
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
          allowExpensiveQueries: false,
          sort: { by: '_count', direction: 'desc' },
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(
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
    test('parses keyword / text result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        searchString: 'cooool',
        allowExpensiveQueries: false,
        fieldName: 'coolTestField.keyword',
        fieldSpec: { aggregatable: true } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: [
            { doc_count: 5, key: 'cool1' },
            { doc_count: 15, key: 'cool2' },
            { doc_count: 10, key: 'cool3' },
          ],
        },
      };
      expect(
        suggestionAggBuilder.parse(rawSearchResponseMock, optionsListRequestBodyMock).suggestions
      ).toMatchInlineSnapshot(`
        Object {
          "cool1": Object {
            "doc_count": 5,
          },
          "cool2": Object {
            "doc_count": 15,
          },
          "cool3": Object {
            "doc_count": 10,
          },
        }
      `);
    });

    test('parses boolean result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'coolean',
        allowExpensiveQueries: false,
        fieldSpec: { type: 'boolean' } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: [
            { doc_count: 55, key_as_string: 'false' },
            { doc_count: 155, key_as_string: 'true' },
          ],
        },
      };
      expect(
        suggestionAggBuilder.parse(rawSearchResponseMock, optionsListRequestBodyMock).suggestions
      ).toMatchInlineSnapshot(`
        Object {
          "false": Object {
            "doc_count": 55,
          },
          "true": Object {
            "doc_count": 155,
          },
        }
      `);
    });

    test('parses nested result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        searchString: 'cooool',
        fieldName: 'coolNestedField',
        allowExpensiveQueries: false,
        fieldSpec: { subType: { nested: { path: 'path.to.nested' } } } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        nestedSuggestions: {
          suggestions: {
            buckets: [
              { doc_count: 5, key: 'cool1' },
              { doc_count: 15, key: 'cool2' },
              { doc_count: 10, key: 'cool3' },
            ],
          },
        },
      };
      expect(
        suggestionAggBuilder.parse(rawSearchResponseMock, optionsListRequestBodyMock).suggestions
      ).toMatchInlineSnapshot(`
        Object {
          "cool1": Object {
            "doc_count": 5,
          },
          "cool2": Object {
            "doc_count": 15,
          },
          "cool3": Object {
            "doc_count": 10,
          },
        }
      `);
    });

    test('parses keyword only result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        searchString: 'cooool',
        allowExpensiveQueries: false,
        fieldName: 'coolTestField.keyword',
        fieldSpec: { aggregatable: true } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: [
            { doc_count: 5, key: 'cool1' },
            { doc_count: 15, key: 'cool2' },
            { doc_count: 10, key: 'cool3' },
          ],
        },
      };
      expect(
        suggestionAggBuilder.parse(rawSearchResponseMock, optionsListRequestBodyMock).suggestions
      ).toMatchInlineSnapshot(`
        Object {
          "cool1": Object {
            "doc_count": 5,
          },
          "cool2": Object {
            "doc_count": 15,
          },
          "cool3": Object {
            "doc_count": 10,
          },
        }
      `);
    });
  });

  test('parses mixed IPv4 and IPv6 result', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      fieldName: 'clientip',
      allowExpensiveQueries: false,
      fieldSpec: { type: 'ip' } as unknown as FieldSpec,
    };
    const suggestionAggBuilder = getCheapSuggestionAggregationBuilder(optionsListRequestBodyMock);
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
    };

    const parsed = suggestionAggBuilder.parse(
      rawSearchResponseMock,
      optionsListRequestBodyMock
    ).suggestions;
    /** first, verify that the sorting worked as expected */
    expect(Object.keys(parsed)).toMatchInlineSnapshot(`
      Array [
        "52:ae76:5947:5e2a:551:fe6a:712a:c72",
        "111.52.174.2",
        "196.162.13.39",
        "f7a9:640b:b5a0:1219:8d75:ed94:3c3e:2e63",
        "23.216.241.120",
        "28c7:c9a4:42fd:16b0:4de5:e41e:28d9:9172",
        "21.35.91.62",
        "21.35.91.61",
        "203.88.33.151",
        "1ec:aa98:b0a6:d07c:590:18a0:8a33:2eb8",
      ]
    `);
    /** then, make sure the object is structured properly */
    expect(parsed).toMatchInlineSnapshot(`
      Object {
        "111.52.174.2": Object {
          "doc_count": 11,
        },
        "196.162.13.39": Object {
          "doc_count": 10,
        },
        "1ec:aa98:b0a6:d07c:590:18a0:8a33:2eb8": Object {
          "doc_count": 6,
        },
        "203.88.33.151": Object {
          "doc_count": 7,
        },
        "21.35.91.61": Object {
          "doc_count": 8,
        },
        "21.35.91.62": Object {
          "doc_count": 8,
        },
        "23.216.241.120": Object {
          "doc_count": 9,
        },
        "28c7:c9a4:42fd:16b0:4de5:e41e:28d9:9172": Object {
          "doc_count": 9,
        },
        "52:ae76:5947:5e2a:551:fe6a:712a:c72": Object {
          "doc_count": 12,
        },
        "f7a9:640b:b5a0:1219:8d75:ed94:3c3e:2e63": Object {
          "doc_count": 10,
        },
      }
    `);
  });
});
