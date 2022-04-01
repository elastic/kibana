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
import type { IndexPatternField } from '../../..';
import { IndexPattern } from '../../..';

describe('Multi Terms Agg', () => {
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
    } as IndexPattern;

    indexPattern.fields.getByName = (name) => ({ name } as unknown as IndexPatternField);
    indexPattern.fields.filter = () => indexPattern.fields;

    return new AggConfigs(
      indexPattern,
      [
        {
          id: 'test',
          params,
          type: BUCKET_TYPES.MULTI_TERMS,
        },
      ],
      { typesRegistry: mockAggTypesRegistry() }
    );
  };

  test('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs({
      fields: ['field', 'string_field'],
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
                "fields": Array [
                  "field",
                  "string_field",
                ],
                "id": Array [
                  "test",
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
              "function": "aggMultiTerms",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
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
    } as IndexPattern;

    indexPattern.fields.getByName = (name) => ({ name } as unknown as IndexPatternField);
    indexPattern.fields.filter = () => indexPattern.fields;

    const aggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: 'test',
          params: {
            fields: ['string_field'],
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
          type: BUCKET_TYPES.MULTI_TERMS,
        },
      ],
      { typesRegistry: mockAggTypesRegistry() }
    );
    const { [BUCKET_TYPES.MULTI_TERMS]: params } = aggConfigs.aggs[0].toDsl();
    expect(params.order).toEqual({ 'test-orderAgg.50': 'desc' });
  });

  test('optionally supports shard_size', () => {
    const aggConfigs = getAggConfigs({
      fields: ['string_field'],
      shardSize: 1000,
      orderAgg: {
        type: 'count',
      },
    });
    const { [BUCKET_TYPES.MULTI_TERMS]: params } = aggConfigs.aggs[0].toDsl();
    expect(params.shard_size).toEqual(1000);
  });
});
