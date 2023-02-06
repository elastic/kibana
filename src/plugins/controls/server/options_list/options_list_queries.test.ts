/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

import {
  getSuggestionAggregationBuilder,
  getValidationAggregationBuilder,
} from './options_list_queries';
import { OptionsListRequestBody } from '../../common/options_list/types';

describe('options list queries', () => {
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

  describe('validation aggregation and parsing', () => {
    test('creates validation aggregation when given selections', () => {
      const validationAggBuilder = getValidationAggregationBuilder();
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolTestField',
        selectedOptions: ['coolOption1', 'coolOption2', 'coolOption3'],
      };
      expect(validationAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "filters": Object {
            "filters": Object {
              "coolOption1": Object {
                "match": Object {
                  "coolTestField": "coolOption1",
                },
              },
              "coolOption2": Object {
                "match": Object {
                  "coolTestField": "coolOption2",
                },
              },
              "coolOption3": Object {
                "match": Object {
                  "coolTestField": "coolOption3",
                },
              },
            },
          },
        }
      `);
    });

    test('returns undefined when not given selections', () => {
      const validationAggBuilder = getValidationAggregationBuilder();
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolTestField',
      };
      expect(validationAggBuilder.buildAggregation(optionsListRequestBodyMock)).toBeUndefined();
    });

    test('parses validation result', () => {
      const validationAggBuilder = getValidationAggregationBuilder();
      rawSearchResponseMock.aggregations = {
        validation: {
          buckets: {
            cool1: { doc_count: 0 },
            cool2: { doc_count: 15 },
            cool3: { doc_count: 0 },
            cool4: { doc_count: 2 },
            cool5: { doc_count: 112 },
            cool6: { doc_count: 0 },
          },
        },
      };
      expect(validationAggBuilder.parse(rawSearchResponseMock)).toMatchInlineSnapshot(`
        Array [
          "cool1",
          "cool3",
          "cool6",
        ]
      `);
    });
  });

  describe('suggestion aggregation', () => {
    describe('text / keyword field', () => {
      test('with a search string, creates case insensitive aggregation', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          fieldName: 'coolTestField.keyword',
          textFieldName: 'coolTestField',
          searchString: 'cooool',
          fieldSpec: { aggregatable: true } as unknown as FieldSpec,
        };
        const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "aggs": Object {
              "keywordSuggestions": Object {
                "terms": Object {
                  "field": "coolTestField.keyword",
                  "order": Object {
                    "_count": "desc",
                  },
                  "shard_size": 10,
                },
              },
            },
            "filter": Object {
              "match_phrase_prefix": Object {
                "coolTestField": "cooool",
              },
            },
          }
        `);
      });

      test('without a search string, creates keyword aggregation', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          fieldName: 'coolTestField.keyword',
          textFieldName: 'coolTestField',
          fieldSpec: { aggregatable: true } as unknown as FieldSpec,
          sort: { by: '_count', direction: 'asc' },
        };
        const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "terms": Object {
              "execution_hint": "map",
              "field": "coolTestField.keyword",
              "include": ".*",
              "order": Object {
                "_count": "asc",
              },
              "shard_size": 10,
            },
          }
        `);
      });
    });

    test('creates boolean aggregation for boolean field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolean',
        fieldSpec: { type: 'boolean' } as unknown as FieldSpec,
        sort: { by: '_key', direction: 'desc' },
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "terms": Object {
            "execution_hint": "map",
            "field": "coolean",
            "order": Object {
              "_key": "desc",
            },
            "shard_size": 10,
          },
        }
      `);
    });

    test('creates nested aggregation for nested field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolNestedField',
        searchString: 'cooool',
        fieldSpec: { subType: { nested: { path: 'path.to.nested' } } } as unknown as FieldSpec,
        sort: { by: '_key', direction: 'asc' },
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "aggs": Object {
            "nestedSuggestions": Object {
              "terms": Object {
                "execution_hint": "map",
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
        }
      `);
    });

    test('creates keyword only aggregation', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolTestField.keyword',
        searchString: 'cooool',
        fieldSpec: { aggregatable: true } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "terms": Object {
            "execution_hint": "map",
            "field": "coolTestField.keyword",
            "include": "cooool.*",
            "order": Object {
              "_count": "desc",
            },
            "shard_size": 10,
          },
        }
      `);
    });

    describe('IP field', () => {
      test('without a search string, creates IP range aggregation with default range', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          fieldName: 'clientip',
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
          sort: { by: '_count', direction: 'asc' },
        };
        const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "aggs": Object {
              "filteredSuggestions": Object {
                "terms": Object {
                  "execution_hint": "map",
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
          }
        `);
      });

      test('full IPv4 in the search string, creates IP range aggregation with CIDR mask', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          fieldName: 'clientip',
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
          searchString: '41.77.243.255',
          sort: { by: '_key', direction: 'desc' },
        };
        const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "aggs": Object {
              "filteredSuggestions": Object {
                "terms": Object {
                  "execution_hint": "map",
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
          }
        `);
      });

      test('full IPv6 in the search string, creates IP range aggregation with CIDR mask', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          fieldName: 'clientip',
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
          searchString: 'f688:fb50:6433:bba2:604:f2c:194a:d3c5',
          sort: { by: '_key', direction: 'asc' },
        };
        const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "aggs": Object {
              "filteredSuggestions": Object {
                "terms": Object {
                  "execution_hint": "map",
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
          }
        `);
      });

      test('partial IPv4 in the search string, creates IP range aggregation with min and max', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          fieldName: 'clientip',
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
          searchString: '41.77',
        };
        const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "aggs": Object {
              "filteredSuggestions": Object {
                "terms": Object {
                  "execution_hint": "map",
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
          }
        `);
      });

      test('partial IPv46 in the search string, creates IP range aggregation with min and max', () => {
        const optionsListRequestBodyMock: OptionsListRequestBody = {
          fieldName: 'clientip',
          fieldSpec: { type: 'ip' } as unknown as FieldSpec,
          searchString: 'cdb6:',
          sort: { by: '_count', direction: 'desc' },
        };
        const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
        expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
          .toMatchInlineSnapshot(`
          Object {
            "aggs": Object {
              "filteredSuggestions": Object {
                "terms": Object {
                  "execution_hint": "map",
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
          }
        `);
      });
    });
  });

  describe('suggestion parsing', () => {
    test('parses keyword / text result', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolTestField.keyword',
        textFieldName: 'coolTestField',
        searchString: 'cooool',
        fieldSpec: { aggregatable: true } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        suggestions: {
          keywordSuggestions: {
            buckets: [
              { doc_count: 5, key: 'cool1' },
              { doc_count: 15, key: 'cool2' },
              { doc_count: 10, key: 'cool3' },
            ],
          },
        },
      };
      expect(suggestionAggBuilder.parse(rawSearchResponseMock)).toMatchInlineSnapshot(`
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
        fieldName: 'coolean',
        fieldSpec: { type: 'boolean' } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: [
            { doc_count: 55, key_as_string: 'false' },
            { doc_count: 155, key_as_string: 'true' },
          ],
        },
      };
      expect(suggestionAggBuilder.parse(rawSearchResponseMock)).toMatchInlineSnapshot(`
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
        fieldName: 'coolNestedField',
        searchString: 'cooool',
        fieldSpec: { subType: { nested: { path: 'path.to.nested' } } } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        suggestions: {
          nestedSuggestions: {
            buckets: [
              { doc_count: 5, key: 'cool1' },
              { doc_count: 15, key: 'cool2' },
              { doc_count: 10, key: 'cool3' },
            ],
          },
        },
      };
      expect(suggestionAggBuilder.parse(rawSearchResponseMock)).toMatchInlineSnapshot(`
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
        fieldName: 'coolTestField.keyword',
        searchString: 'cooool',
        fieldSpec: { aggregatable: true } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      rawSearchResponseMock.aggregations = {
        suggestions: {
          buckets: [
            { doc_count: 5, key: 'cool1' },
            { doc_count: 15, key: 'cool2' },
            { doc_count: 10, key: 'cool3' },
          ],
        },
      };
      expect(suggestionAggBuilder.parse(rawSearchResponseMock)).toMatchInlineSnapshot(`
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
      fieldName: 'clientip',
      fieldSpec: { type: 'ip' } as unknown as FieldSpec,
    };
    const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
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

    const parsed = suggestionAggBuilder.parse(rawSearchResponseMock);
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
