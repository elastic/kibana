/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggConfigs } from '../agg_configs';
import { FieldFormatsGetConfigFn, NumberFormat } from '@kbn/field-formats-plugin/common';
import { getShardDelayBucketAgg, SHARD_DELAY_AGG_NAME } from './shard_delay';

describe('Shard Delay Agg', () => {
  const getConfig = (() => {}) as FieldFormatsGetConfigFn;
  const getAggConfigs = () => {
    const field = { name: 'bytes' };

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
          type: SHARD_DELAY_AGG_NAME,
          params: {
            duration: 1000,
          },
        },
      ],
      {
        typesRegistry: {
          get: getShardDelayBucketAgg,
        } as any,
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
              "delay": Array [
                "5s",
              ],
              "enabled": Array [
                true,
              ],
              "id": Array [
                "1",
              ],
            },
            "function": "aggShardDelay",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  describe('write', () => {
    test('writes the delay as the value parameter', () => {
      const aggConfigs = getAggConfigs();
      const agg = aggConfigs.aggs[0];
      expect(agg.write(aggConfigs)).toMatchInlineSnapshot(`
        Object {
          "params": Object {
            "value": "5s",
          },
        }
      `);
    });
  });
});
