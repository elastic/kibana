/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IPercentileAggConfig, getPercentilesMetricAgg } from './percentiles';
import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';

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

  it('returns NaN if bucket has zero documents', () => {
    const agg = {
      id: '1.5',
      key: 5,
      parentId: '1',
    } as IResponseAggConfig;
    const percentileValue: any = getPercentilesMetricAgg().getValue(agg, {
      doc_count: 0,
    });

    expect(percentileValue).toBe(NaN);
  });

  it('computes the value correctly', () => {
    const agg = {
      id: '1.5',
      key: 5,
      parentId: '1',
    } as IResponseAggConfig;
    const percentileValue: any = getPercentilesMetricAgg().getValue(agg, {
      doc_count: 0,
      1: {
        values: [
          {
            key: 1,
            value: 0,
          },
          {
            key: 5,
            value: 306.5442142237532,
          },
          {
            key: 75,
            value: 8014.248827201506,
          },
          {
            key: 95,
            value: 10118.560640759324,
          },
          {
            key: 99,
            value: 18028.720727798096,
          },
        ],
      },
    });

    expect(percentileValue).toBe(306.5442142237532);
  });
});
