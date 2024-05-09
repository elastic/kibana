/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { OptionsListRequestBody } from '../../../common/options_list/types';
import { getExactMatchAggregationBuilder } from './options_list_exact_match';

describe('options list exact match search query', () => {
  test('returns empty result when given invalid search', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      fieldName: 'bytes',
      allowExpensiveQueries: true,
      sort: { by: '_key', direction: 'desc' },
      searchString: '1a2b3c',
      fieldSpec: { type: 'number' } as unknown as FieldSpec,
    };
    const aggregationBuilder = getExactMatchAggregationBuilder();
    const aggregation = aggregationBuilder.buildAggregation(optionsListRequestBodyMock);
    expect(aggregation).toEqual({});
    const parsed = aggregationBuilder.parse(
      {} as any as SearchResponse,
      optionsListRequestBodyMock
    );
    expect(parsed).toEqual({ suggestions: [], totalCardinality: 0 });
  });

  describe('suggestion aggregation', () => {
    test('string (keyword, text+keyword) field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'testField',
        allowExpensiveQueries: true,
        searchString: 'searchForMe',
        fieldSpec: { type: 'string' } as unknown as FieldSpec,
      };
      const aggregationBuilder = getExactMatchAggregationBuilder();
      const aggregation = aggregationBuilder.buildAggregation(optionsListRequestBodyMock);
      expect(aggregation).toMatchObject({
        suggestions: {
          filter: {
            term: {
              testField: {
                value: 'searchForMe',
                case_insensitive: true,
              },
            },
          },
          aggs: {
            filteredSuggestions: {
              terms: {
                field: 'testField',
                shard_size: 10,
              },
            },
          },
        },
      });
    });

    test('nested string (keyword, text+keyword) field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'testField',
        allowExpensiveQueries: true,
        searchString: 'searchForMe',
        fieldSpec: {
          type: 'string',
          subType: { nested: { path: 'path.to.nested' } },
        } as unknown as FieldSpec,
      };
      const aggregationBuilder = getExactMatchAggregationBuilder();
      const aggregation = aggregationBuilder.buildAggregation(optionsListRequestBodyMock);

      expect(aggregation).toMatchObject({
        nestedSuggestions: {
          nested: {
            path: 'path.to.nested',
          },
          aggs: {
            suggestions: {
              filter: {
                term: {
                  testField: {
                    value: 'searchForMe',
                    case_insensitive: true,
                  },
                },
              },
              aggs: {
                filteredSuggestions: {
                  terms: {
                    field: 'testField',
                    shard_size: 10,
                  },
                },
              },
            },
          },
        },
      });
    });

    test('number field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'bytes',
        allowExpensiveQueries: true,
        searchString: '123',
        fieldSpec: { type: 'number' } as unknown as FieldSpec,
      };
      const aggregationBuilder = getExactMatchAggregationBuilder();
      const aggregation = aggregationBuilder.buildAggregation(optionsListRequestBodyMock);
      expect(aggregation).toMatchObject({
        suggestions: {
          filter: {
            term: {
              bytes: {
                value: '123',
                case_insensitive: false, // this is the only part that is dependent on field type
              },
            },
          },
          aggs: {
            filteredSuggestions: {
              terms: {
                field: 'bytes',
                shard_size: 10,
              },
            },
          },
        },
      });
    });
  });

  test('suggestion parsing', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      searchString: 'cool',
      allowExpensiveQueries: true,
      fieldName: 'coolTestField.keyword',
      fieldSpec: { type: 'string' } as unknown as FieldSpec,
    };
    const aggregationBuilder = getExactMatchAggregationBuilder();

    const searchResponseMock = {
      hits: {
        total: 1,
        max_score: 1,
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
      aggregations: {
        suggestions: {
          filteredSuggestions: {
            buckets: [{ doc_count: 5, key: 'cool1' }],
          },
        },
      },
    };
    expect(aggregationBuilder.parse(searchResponseMock, optionsListRequestBodyMock)).toMatchObject({
      suggestions: [{ docCount: 5, value: 'cool1' }],
      totalCardinality: 1,
    });
  });
});
