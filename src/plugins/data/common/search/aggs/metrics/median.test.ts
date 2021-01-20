/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';

describe('AggTypeMetricMedianProvider class', () => {
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
          id: METRIC_TYPES.MEDIAN,
          type: METRIC_TYPES.MEDIAN,
          schema: 'metric',
          params: {
            field: 'bytes',
          },
        },
      ],
      {
        typesRegistry,
      }
    );
  });

  it('requests the percentiles aggregation in the Elasticsearch query DSL', () => {
    const dsl: Record<string, any> = aggConfigs.toDsl();

    expect(dsl.median.percentiles.field).toEqual('bytes');
    expect(dsl.median.percentiles.percents).toEqual([50]);
  });

  it('points to right value within multi metric for value bucket path', () => {
    expect(aggConfigs.byId(METRIC_TYPES.MEDIAN)!.getValueBucketPath()).toEqual(
      `${METRIC_TYPES.MEDIAN}.50`
    );
  });

  it('converts the response', () => {
    const agg = aggConfigs.getResponseAggs()[0];

    expect(
      agg.getValue({
        [agg.id]: {
          values: {
            '50.0': 10,
          },
        },
      })
    ).toEqual(10);
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
                "median",
              ],
              "schema": Array [
                "metric",
              ],
            },
            "function": "aggMedian",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });
});
