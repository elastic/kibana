/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';

describe('AggTypeMetricSinglePercentileRankProvider class', () => {
  let aggConfigs: IAggConfigs;

  beforeEach(() => {
    const typesRegistry = mockAggTypesRegistry();
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
    } as any;

    aggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: METRIC_TYPES.SINGLE_PERCENTILE_RANK,
          type: METRIC_TYPES.SINGLE_PERCENTILE_RANK,
          schema: 'metric',
          params: {
            field: 'bytes',
            value: 1024,
          },
        },
      ],
      {
        typesRegistry,
      },
      jest.fn()
    );
  });

  it('requests the percentile ranks aggregation in the Elasticsearch query DSL', () => {
    const dsl: Record<string, any> = aggConfigs.toDsl();

    expect(dsl.single_percentile_rank.percentile_ranks.field).toEqual('bytes');
    expect(dsl.single_percentile_rank.percentile_ranks.values).toEqual([1024]);
  });

  it('points to right value within multi metric for value bucket path', () => {
    expect(aggConfigs.byId(METRIC_TYPES.SINGLE_PERCENTILE_RANK)!.getValueBucketPath()).toEqual(
      `${METRIC_TYPES.SINGLE_PERCENTILE_RANK}.1024`
    );
  });

  it('converts the response', () => {
    const agg = aggConfigs.getResponseAggs()[0];

    expect(
      agg.getValue({
        [agg.id]: {
          values: {
            '1024.0': 123,
          },
        },
      })
    ).toEqual(1.23);
  });

  it('should not throw error for empty buckets', () => {
    const agg = aggConfigs.getResponseAggs()[0];
    expect(agg.getValue({})).toEqual(NaN);
  });

  it('produces the expected expression ast', () => {
    const agg = aggConfigs.getResponseAggs()[0];
    expect(agg.toExpressionAst()).toMatchInlineSnapshot(`
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
                "single_percentile_rank",
              ],
              "schema": Array [
                "metric",
              ],
              "value": Array [
                1024,
              ],
            },
            "function": "aggSinglePercentileRank",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  it('supports scripted fields', () => {
    const typesRegistry = mockAggTypesRegistry();
    const field = {
      name: 'bytes',
      scripted: true,
      language: 'painless',
      script: 'return 456',
    };
    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
    } as any;

    aggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: METRIC_TYPES.SINGLE_PERCENTILE_RANK,
          type: METRIC_TYPES.SINGLE_PERCENTILE_RANK,
          schema: 'metric',
          params: {
            field: 'bytes',
            value: 1024,
          },
        },
      ],
      {
        typesRegistry,
      },
      jest.fn()
    );

    expect(aggConfigs.toDsl().single_percentile_rank.percentile_ranks.script.source).toEqual(
      'return 456'
    );
    expect(aggConfigs.toDsl().single_percentile_rank.percentile_ranks.values).toEqual([1024]);
  });
});
