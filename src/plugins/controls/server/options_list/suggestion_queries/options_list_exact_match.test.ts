/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { OptionsListRequestBody } from '../../../common/options_list/types';
import { getExactMatchAggregationBuilder } from './options_list_exact_match';

describe('options list exact match search query', () => {
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

    test('numeric field', () => {
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

  describe('parsing', () => {
    test('parses keyword result', () => {
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
      expect(
        aggregationBuilder.parse(searchResponseMock, optionsListRequestBodyMock)
      ).toMatchObject({
        suggestions: [{ docCount: 5, value: 'cool1' }],
        totalCardinality: 1,
      });
    });
  });

  test('parses numeric field result', () => {
    const optionsListRequestBodyMock: OptionsListRequestBody = {
      size: 10,
      fieldName: 'bytes',
      allowExpensiveQueries: true,
      searchString: '12345',
      fieldSpec: { type: 'number' } as unknown as FieldSpec,
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
            buckets: [{ doc_count: 5, key: 12345 }],
          },
        },
      },
    };
    expect(aggregationBuilder.parse(searchResponseMock, optionsListRequestBodyMock)).toMatchObject({
      suggestions: [{ docCount: 5, value: 12345 }],
      totalCardinality: 1,
    });
  });
});
