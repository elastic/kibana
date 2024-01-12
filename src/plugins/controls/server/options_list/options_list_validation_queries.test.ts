/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { FieldSpec } from '@kbn/data-views-plugin/common';

import { OptionsListRequestBody } from '../../common/options_list/types';
import { getValidationAggregationBuilder } from './options_list_validation_queries';

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

  describe('validation aggregation', () => {
    test('returns empty aggregation when not given selections', () => {
      const validationAggBuilder = getValidationAggregationBuilder();
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'coolTestField',
        allowExpensiveQueries: true,
      };
      expect(
        validationAggBuilder.buildAggregation(optionsListRequestBodyMock)
      ).toMatchInlineSnapshot(`Object {}`);
    });

    test('creates validation aggregation when given selections', () => {
      const validationAggBuilder = getValidationAggregationBuilder();
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'coolTestField',
        allowExpensiveQueries: true,
        selectedOptions: ['coolOption1', 'coolOption2', 'coolOption3'],
      };
      expect(validationAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "validation": Object {
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
          },
        }
      `);
    });

    test('creates validation aggregation for nested fields when given selections', () => {
      const validationAggBuilder = getValidationAggregationBuilder();
      const optionsListRequestBodyMock: OptionsListRequestBody = {
        size: 10,
        fieldName: 'coolTestField',
        fieldSpec: {
          type: 'string',
          subType: { nested: { path: 'path.to.nested' } },
        } as unknown as FieldSpec,
        allowExpensiveQueries: true,
        selectedOptions: ['coolOption1', 'coolOption2', 'coolOption3'],
      };
      expect(validationAggBuilder.buildAggregation(optionsListRequestBodyMock))
        .toMatchInlineSnapshot(`
        Object {
          "nestedValidation": Object {
            "aggs": Object {
              "validation": Object {
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

  describe('validation parsing', () => {
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
      expect(
        validationAggBuilder.parse(rawSearchResponseMock, {
          size: 10,
          fieldName: 'coolTestField',
          allowExpensiveQueries: true,
        })
      ).toMatchInlineSnapshot(`
        Array [
          "cool1",
          "cool3",
          "cool6",
        ]
      `);
    });

    test('parses validation result for nested field', () => {
      const validationAggBuilder = getValidationAggregationBuilder();
      rawSearchResponseMock.aggregations = {
        nestedValidation: {
          validation: {
            buckets: {
              cool1: { doc_count: 0 },
              cool2: { doc_count: 15 },
              cool3: { doc_count: 0 },
              cool4: { doc_count: 0 },
              cool5: { doc_count: 0 },
              cool6: { doc_count: 112 },
            },
          },
        },
      };
      expect(
        validationAggBuilder.parse(rawSearchResponseMock, {
          size: 10,
          fieldSpec: {
            type: 'string',
            subType: { nested: { path: 'path.to.nested' } },
          } as unknown as FieldSpec,
          fieldName: 'coolTestField',
          allowExpensiveQueries: true,
        })
      ).toMatchInlineSnapshot(`
        Array [
          "cool1",
          "cool3",
          "cool4",
          "cool5",
        ]
      `);
    });
  });
});
