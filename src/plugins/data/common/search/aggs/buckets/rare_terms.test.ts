/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import type { IndexPatternField } from '../../..';
import { IndexPattern } from '../../..';

describe('rare terms Agg', () => {
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
          type: BUCKET_TYPES.RARE_TERMS,
        },
      ],
      { typesRegistry: mockAggTypesRegistry() }
    );
  };

  test('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs({
      field: 'field',
      max_doc_count: 5,
    });
    expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "enabled": Array [
                  true,
                ],
                "field": Array [
                  "field",
                ],
                "id": Array [
                  "test",
                ],
                "max_doc_count": Array [
                  5,
                ],
              },
              "function": "aggRareTerms",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
  });
});
