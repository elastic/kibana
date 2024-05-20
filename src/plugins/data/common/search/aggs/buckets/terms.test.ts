/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggConfigs } from '../agg_configs';
import { METRIC_TYPES } from '../metrics';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';

describe('Terms Agg', () => {
  describe('order agg editor UI', () => {
    const getAggConfigs = (params: Record<string, any> = {}) => {
      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: [
          {
            name: 'field',
            type: 'string',
            esTypes: ['string'],
            aggregatable: true,
            filterable: true,
            searchable: true,
          },
          {
            name: 'string_field',
            type: 'string',
            esTypes: ['string'],
            aggregatable: true,
            filterable: true,
            searchable: true,
          },
          {
            name: 'empty_number_field',
            type: 'number',
            esTypes: ['number'],
            aggregatable: true,
            filterable: true,
            searchable: true,
          },
          {
            name: 'number_field',
            type: 'number',
            esTypes: ['number'],
            aggregatable: true,
            filterable: true,
            searchable: true,
          },
        ],
      } as DataView;

      indexPattern.fields.getByName = (name) => ({ name } as unknown as DataViewField);
      indexPattern.fields.filter = () => indexPattern.fields;

      return new AggConfigs(
        indexPattern,
        [
          {
            id: 'test',
            params,
            type: BUCKET_TYPES.TERMS,
          },
        ],
        { typesRegistry: mockAggTypesRegistry() },
        jest.fn()
      );
    };

    test('produces the expected expression ast', () => {
      const aggConfigs = getAggConfigs({
        include: {
          pattern: '404',
        },
        exclude: {
          pattern: '400',
        },
        field: {
          name: 'field',
        },
        orderAgg: {
          type: 'count',
        },
      });
      expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "enabled": Array [
                  true,
                ],
                "excludeIsRegex": Array [
                  true,
                ],
                "field": Array [
                  "field",
                ],
                "id": Array [
                  "test",
                ],
                "includeIsRegex": Array [
                  true,
                ],
                "missingBucket": Array [
                  false,
                ],
                "missingBucketLabel": Array [
                  "Missing",
                ],
                "order": Array [
                  "desc",
                ],
                "orderAgg": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "emptyAsNull": Array [
                            false,
                          ],
                          "enabled": Array [
                            true,
                          ],
                          "id": Array [
                            "test-orderAgg",
                          ],
                          "schema": Array [
                            "orderAgg",
                          ],
                        },
                        "function": "aggCount",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
                "otherBucket": Array [
                  false,
                ],
                "otherBucketLabel": Array [
                  "Other",
                ],
                "size": Array [
                  5,
                ],
              },
              "function": "aggTerms",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    test('converts object to string type', () => {
      const aggConfigs = getAggConfigs({
        include: {
          pattern: '404',
        },
        exclude: {
          pattern: '400',
        },
        field: {
          name: 'field',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('field');
      expect(params.include).toBe('404');
      expect(params.exclude).toBe('400');
    });

    test('accepts string from string field type and writes this value', () => {
      const aggConfigs = getAggConfigs({
        include: 'include value',
        exclude: 'exclude value',
        field: {
          name: 'string_field',
          type: 'string',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('string_field');
      expect(params.include).toBe('include value');
      expect(params.exclude).toBe('exclude value');
    });

    test('accepts array of strings from string field type and writes this value', () => {
      const aggConfigs = getAggConfigs({
        include: ['include1', 'include2'],
        exclude: ['exclude1'],
        includeIsRegex: false,
        excludeIsRegex: false,
        field: {
          name: 'string_field',
          type: 'string',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('string_field');
      expect(params.include).toStrictEqual(['include1', 'include2']);
      expect(params.exclude).toStrictEqual(['exclude1']);
    });

    test('accepts array of string with regex and returns the pattern', () => {
      const aggConfigs = getAggConfigs({
        include: ['include.*'],
        exclude: ['exclude.*'],
        includeIsRegex: true,
        excludeIsRegex: true,
        field: {
          name: 'string_field',
          type: 'string',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('string_field');
      expect(params.include).toBe('include.*');
      expect(params.exclude).toBe('exclude.*');
    });

    test('accepts array of empty strings and does not write a value', () => {
      const aggConfigs = getAggConfigs({
        include: [''],
        exclude: [''],
        field: {
          name: 'string_field',
          type: 'string',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('string_field');
      expect(params.include).toBe(undefined);
      expect(params.exclude).toBe(undefined);
    });

    test('accepts empty array from number field type and does not write a value', () => {
      const aggConfigs = getAggConfigs({
        include: [],
        exclude: [],
        field: {
          name: 'empty_number_field',
          type: 'number',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('empty_number_field');
      expect(params.include).toBe(undefined);
      expect(params.exclude).toBe(undefined);
    });

    test('filters array with empty strings from number field type and writes only numbers', () => {
      const aggConfigs = getAggConfigs({
        include: [1.1, 2, '', 3.33, ''],
        exclude: ['', 4, 5.555, '', 6],
        field: {
          name: 'number_field',
          type: 'number',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('number_field');
      expect(params.include).toStrictEqual([1.1, 2, 3.33]);
      expect(params.exclude).toStrictEqual([4, 5.555, 6]);
    });

    test('uses correct bucket path for sorting by median', () => {
      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: [
          {
            name: 'string_field',
            type: 'string',
            esTypes: ['string'],
            aggregatable: true,
            filterable: true,
            searchable: true,
          },
          {
            name: 'number_field',
            type: 'number',
            esTypes: ['number'],
            aggregatable: true,
            filterable: true,
            searchable: true,
          },
        ],
      } as DataView;

      indexPattern.fields.getByName = (name) => ({ name } as unknown as DataViewField);
      indexPattern.fields.filter = () => indexPattern.fields;

      const aggConfigs = new AggConfigs(
        indexPattern,
        [
          {
            id: 'test',
            params: {
              field: {
                name: 'string_field',
                type: 'string',
              },
              orderAgg: {
                type: METRIC_TYPES.MEDIAN,
                params: {
                  field: {
                    name: 'number_field',
                    type: 'number',
                  },
                },
              },
            },
            type: BUCKET_TYPES.TERMS,
          },
        ],
        { typesRegistry: mockAggTypesRegistry() },
        jest.fn()
      );
      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.order).toEqual({ 'test-orderAgg.50': 'desc' });
    });

    // 25 is the default shard size set for size:10 by Elasticsearch.
    // Setting it to 25 for every size below 10 makes sure the shard size doesn't change for sizes 1-10, keeping the top terms stable.
    test('set shard_size to 25 if size is smaller or equal than 10', () => {
      const aggConfigs = getAggConfigs({
        field: 'string_field',
        orderAgg: {
          type: 'count',
        },
        size: 5,
      });
      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();
      expect(params.shard_size).toEqual(25);
    });

    test('do not set shard_size if size is bigger than 10', () => {
      const aggConfigs = getAggConfigs({
        field: 'string_field',
        orderAgg: {
          type: 'count',
        },
        size: 15,
      });
      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();
      expect(params.shard_size).toBeUndefined();
    });

    test('optionally supports shard_size', () => {
      const aggConfigs = getAggConfigs({
        field: 'string_field',
        orderAgg: {
          type: 'count',
        },
        shardSize: 1000,
      });
      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();
      expect(params.shard_size).toEqual(1000);
    });

    test('should override "hasPrecisionError" for the "terms" bucket type', () => {
      const aggConfigs = getAggConfigs();
      const { type } = aggConfigs.aggs[0];

      expect(type.hasPrecisionError).toBeInstanceOf(Function);

      expect(type.hasPrecisionError!({})).toBeFalsy();
      expect(type.hasPrecisionError!({ doc_count_error_upper_bound: 0 })).toBeFalsy();
      expect(type.hasPrecisionError!({ doc_count_error_upper_bound: -1 })).toBeTruthy();
    });
  });
});
