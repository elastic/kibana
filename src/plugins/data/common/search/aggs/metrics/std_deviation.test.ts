/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IStdDevAggConfig, getStdDeviationMetricAgg } from './std_deviation';
import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';

describe('AggTypeMetricStandardDeviationProvider class', () => {
  const typesRegistry = mockAggTypesRegistry();
  const getAggConfigs = ({
    customLabel,
    showBounds,
  }: { customLabel?: string; showBounds?: boolean } = {}) => {
    const field = {
      name: 'memory',
    };
    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
    } as any;

    return new AggConfigs(
      indexPattern,
      [
        {
          id: METRIC_TYPES.STD_DEV,
          type: METRIC_TYPES.STD_DEV,
          schema: 'metric',
          params: {
            field: {
              displayName: 'memory',
            },
            customLabel,
            ...(showBounds != null ? { showBounds } : {}),
          },
        },
      ],
      { typesRegistry },
      jest.fn()
    );
  };

  it('uses the custom label if it is set', () => {
    const aggConfigs = getAggConfigs({ customLabel: 'custom label' });
    const responseAggs: any = getStdDeviationMetricAgg().getResponseAggs(
      aggConfigs.aggs[0] as IStdDevAggConfig
    );

    const lowerStdDevLabel = responseAggs[0].makeLabel();
    const upperStdDevLabel = responseAggs[1].makeLabel();

    expect(lowerStdDevLabel).toBe('Lower custom label');
    expect(upperStdDevLabel).toBe('Upper custom label');
  });

  it('uses the default labels if custom label is not set', () => {
    const aggConfigs = getAggConfigs();

    const responseAggs: any = getStdDeviationMetricAgg().getResponseAggs(
      aggConfigs.aggs[0] as IStdDevAggConfig
    );

    const lowerStdDevLabel = responseAggs[0].makeLabel();
    const upperStdDevLabel = responseAggs[1].makeLabel();

    expect(lowerStdDevLabel).toBe('Lower Standard Deviation of memory');
    expect(upperStdDevLabel).toBe('Upper Standard Deviation of memory');
  });

  it('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs();

    const responseAggs: any = getStdDeviationMetricAgg().getResponseAggs(
      aggConfigs.aggs[0] as IStdDevAggConfig
    );
    expect(responseAggs[0].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "enabled": Array [
                true,
              ],
              "id": Array [
                "std_dev.std_lower",
              ],
              "schema": Array [
                "metric",
              ],
            },
            "function": "aggStdDeviation",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  it('returns null without throwing if no "extended_stats" is returned', () => {
    const aggConfigs = getAggConfigs({ showBounds: false });

    expect(() =>
      getStdDeviationMetricAgg().getValue(aggConfigs.aggs[0] as IStdDevAggConfig, {})
    ).not.toThrow();
  });
});
