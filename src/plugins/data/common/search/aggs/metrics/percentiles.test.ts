/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IPercentileAggConfig, getPercentilesMetricAgg } from './percentiles';
import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';

describe('AggTypesMetricsPercentilesProvider class', () => {
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
          id: METRIC_TYPES.PERCENTILES,
          type: METRIC_TYPES.PERCENTILES,
          schema: 'metric',
          params: {
            field: 'bytes',
            customLabel: 'prince',
            percents: [95],
          },
        },
      ],
      { typesRegistry }
    );
  });

  it('uses the custom label if it is set', () => {
    const responseAggs: any = getPercentilesMetricAgg().getResponseAggs(
      aggConfigs.aggs[0] as IPercentileAggConfig
    );

    const ninetyFifthPercentileLabel = responseAggs[0].makeLabel();

    expect(ninetyFifthPercentileLabel).toBe('95th percentile of prince');
  });

  it('produces the expected expression ast', () => {
    const responseAggs: any = getPercentilesMetricAgg().getResponseAggs(
      aggConfigs.aggs[0] as IPercentileAggConfig
    );
    expect(responseAggs[0].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "customLabel": Array [
                "prince",
              ],
              "enabled": Array [
                true,
              ],
              "field": Array [
                "bytes",
              ],
              "id": Array [
                "percentiles.95",
              ],
              "percents": Array [
                95,
              ],
              "schema": Array [
                "metric",
              ],
            },
            "function": "aggPercentiles",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });
});
