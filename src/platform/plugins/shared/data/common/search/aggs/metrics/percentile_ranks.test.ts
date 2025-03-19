/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  IPercentileRanksAggConfig,
  getPercentileRanksMetricAgg,
  PercentileRanksMetricAggDependencies,
} from './percentile_ranks';
import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry, mockGetFieldFormatsStart } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';

describe('AggTypesMetricsPercentileRanksProvider class', function () {
  let aggConfigs: IAggConfigs;
  let aggTypesDependencies: PercentileRanksMetricAggDependencies;

  beforeEach(() => {
    aggTypesDependencies = { getFieldFormatsStart: mockGetFieldFormatsStart };
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
          id: METRIC_TYPES.PERCENTILE_RANKS,
          type: METRIC_TYPES.PERCENTILE_RANKS,
          schema: 'metric',
          params: {
            field: 'bytes',
            customLabel: 'my custom field label',
            values: [5000, 10000],
          },
        },
      ],
      { typesRegistry },
      jest.fn()
    );
  });

  it('uses the custom label if it is set', () => {
    const responseAggs: any = getPercentileRanksMetricAgg(aggTypesDependencies).getResponseAggs(
      aggConfigs.aggs[0] as IPercentileRanksAggConfig
    );

    const percentileRankLabelFor5kBytes = responseAggs[0].makeLabel();
    const percentileRankLabelFor10kBytes = responseAggs[1].makeLabel();

    expect(percentileRankLabelFor5kBytes).toBe('Percentile rank 5000 of "my custom field label"');
    expect(percentileRankLabelFor10kBytes).toBe('Percentile rank 10000 of "my custom field label"');
  });

  it('produces the expected expression ast', () => {
    const responseAggs: any = getPercentileRanksMetricAgg(aggTypesDependencies).getResponseAggs(
      aggConfigs.aggs[0] as IPercentileRanksAggConfig
    );
    expect(responseAggs[0].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "customLabel": Array [
                "my custom field label",
              ],
              "enabled": Array [
                true,
              ],
              "field": Array [
                "bytes",
              ],
              "id": Array [
                "percentile_ranks.5000",
              ],
              "schema": Array [
                "metric",
              ],
              "values": Array [
                5000,
                10000,
              ],
            },
            "function": "aggPercentileRanks",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
    expect(responseAggs[1].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "customLabel": Array [
                "my custom field label",
              ],
              "enabled": Array [
                true,
              ],
              "field": Array [
                "bytes",
              ],
              "id": Array [
                "percentile_ranks.10000",
              ],
              "schema": Array [
                "metric",
              ],
              "values": Array [
                5000,
                10000,
              ],
            },
            "function": "aggPercentileRanks",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });
});
