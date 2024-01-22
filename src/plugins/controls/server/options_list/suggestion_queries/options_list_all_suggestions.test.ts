/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { OptionsListRequestBody } from '../../../common/options_list/types';
import { getAllSuggestionsAggregationBuilder } from './options_list_all_suggestions';

describe('options list fetch all suggestions query', () => {
  describe('suggestion aggregation', () => {
    test('number field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'bytes',
        allowExpensiveQueries: true,
        fieldSpec: {
          type: 'number',
        } as unknown as FieldSpec,
        sort: {
          by: '_key',
          direction: 'asc',
        },
      };
      const aggregationBuilder = getAllSuggestionsAggregationBuilder();
      const aggregation = aggregationBuilder.buildAggregation(optionsListRequestBodyMock);

      expect(aggregation).toMatchObject({
        suggestions: {
          terms: {
            size: 10,
            shard_size: 10,
            field: 'bytes',
            order: {
              _key: 'asc',
            },
          },
        },
        unique_terms: {
          cardinality: {
            field: 'bytes',
          },
        },
      });
    });

    test('nested string (keyword, text+keyword) field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'testField',
        allowExpensiveQueries: true,
        fieldSpec: {
          type: 'string',
          subType: { nested: { path: 'path.to.nested' } },
        } as unknown as FieldSpec,
      };
      const aggregationBuilder = getAllSuggestionsAggregationBuilder();
      const aggregation = aggregationBuilder.buildAggregation(optionsListRequestBodyMock);

      expect(aggregation).toMatchObject({
        nestedSuggestions: {
          nested: {
            path: 'path.to.nested',
          },
          aggs: {
            suggestions: {
              terms: {
                size: 10,
                shard_size: 10,
                field: 'testField',
                order: {
                  _count: 'desc',
                },
              },
            },
            unique_terms: {
              cardinality: {
                field: 'testField',
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
      fieldName: 'bytes',
      allowExpensiveQueries: true,
      fieldSpec: {
        type: 'number',
      } as unknown as FieldSpec,
      sort: {
        by: '_key',
        direction: 'asc',
      },
    };
    const aggregationBuilder = getAllSuggestionsAggregationBuilder();
    const searchResponseMock = {
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
      aggregations: {
        suggestions: {
          buckets: [
            { doc_count: 5, key: '1' },
            { doc_count: 4, key: '2' },
            { doc_count: 3, key: '3' },
          ],
        },
        unique_terms: {
          value: 3,
        },
      },
    };

    const parsed = aggregationBuilder.parse(searchResponseMock, optionsListRequestBodyMock);
    expect(parsed).toMatchObject({
      suggestions: [
        { value: '1', docCount: 5 },
        { value: '2', docCount: 4 },
        { value: '3', docCount: 3 },
      ],
      totalCardinality: 3,
    });
  });
});
