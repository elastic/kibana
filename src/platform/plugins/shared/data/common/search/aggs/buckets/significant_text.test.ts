/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';

describe('Significant Text Agg', () => {
  const getAggConfigs = (params: Record<string, any> = {}) => {
    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
    } as any;

    const field = {
      name: 'field',
      indexPattern,
    };

    return new AggConfigs(
      indexPattern,
      [
        {
          id: 'test',
          type: BUCKET_TYPES.SIGNIFICANT_TEXT,
          params,
        },
      ],
      {
        typesRegistry: mockAggTypesRegistry(),
      },
      jest.fn()
    );
  };

  test('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs({
      size: 'SIZE',
      field: {
        name: 'FIELD',
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
              "field": Array [
                "FIELD",
              ],
              "id": Array [
                "test",
              ],
              "size": Array [
                "SIZE",
              ],
            },
            "function": "aggSignificantText",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  test('should generate correct label', () => {
    const aggConfigs = getAggConfigs({
      size: 'SIZE',
      field: {
        name: 'FIELD',
      },
    });
    const label = aggConfigs.aggs[0].makeLabel();

    expect(label).toBe('Top SIZE unusual terms from "FIELD" text');
  });
});
