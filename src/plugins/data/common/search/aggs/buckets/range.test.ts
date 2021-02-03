/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import { FieldFormatsGetConfigFn, NumberFormat } from '../../../../common/field_formats';

describe('Range Agg', () => {
  const getConfig = (() => {}) as FieldFormatsGetConfigFn;
  const getAggConfigs = () => {
    const field = {
      name: 'bytes',
    };

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
      getFormatterForField: () =>
        new NumberFormat(
          {
            pattern: '0,0.[000] b',
          },
          getConfig
        ),
    } as any;

    return new AggConfigs(
      indexPattern,
      [
        {
          type: BUCKET_TYPES.RANGE,
          schema: 'segment',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 },
            ],
          },
        },
      ],
      {
        typesRegistry: mockAggTypesRegistry(),
      }
    );
  };

  test('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs();
    expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "enabled": Array [
                true,
              ],
              "field": Array [
                "bytes",
              ],
              "id": Array [
                "1",
              ],
              "ranges": Array [
                "[{\\"from\\":0,\\"to\\":1000},{\\"from\\":1000,\\"to\\":2000}]",
              ],
              "schema": Array [
                "segment",
              ],
            },
            "function": "aggRange",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  describe('getSerializedFormat', () => {
    test('generates a serialized field format in the expected shape', () => {
      const aggConfigs = getAggConfigs();
      const agg = aggConfigs.aggs[0];
      expect(agg.type.getSerializedFormat(agg)).toMatchInlineSnapshot(`
        Object {
          "id": "range",
          "params": Object {
            "id": "number",
            "params": Object {
              "pattern": "0,0.[000] b",
            },
          },
        }
      `);
    });
  });
});
