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

  describe('suggestion aggregation and parsing', () => {
    test('creates case insensitive aggregation for a text / keyword field with a search string', () => {
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

    test('creates keyword aggregation for a text / keyword field without a search string', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolTestField.keyword',
        textFieldName: 'coolTestField',
        fieldSpec: { aggregatable: true } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "terms": Object {
            "execution_hint": "map",
            "field": "coolTestField.keyword",
            "include": ".*",
            "shard_size": 10,
          },
        }
      `);
    });

    test('creates boolean aggregation for boolean field', () => {
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        fieldName: 'coolean',
        fieldSpec: { type: 'boolean' } as unknown as FieldSpec,
      };
      const suggestionAggBuilder = getSuggestionAggregationBuilder(optionsListRequestBodyMock);
      expect(suggestionAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "terms": Object {
            "execution_hint": "map",
            "field": "coolean",
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
            "shard_size": 10,
          },
        }
      `);
    });

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
        Array [
          "cool1",
          "cool2",
          "cool3",
        ]
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
        Array [
          "false",
          "true",
        ]
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
        Array [
          "cool1",
          "cool2",
          "cool3",
        ]
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
        Array [
          "cool1",
          "cool2",
          "cool3",
        ]
      `);
    });
  });
});
