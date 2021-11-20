/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';

describe('AggTypeMetricSinglePercentileProvider class', () => {
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
          id: METRIC_TYPES.SINGLE_PERCENTILE,
          type: METRIC_TYPES.SINGLE_PERCENTILE,
          schema: 'metric',
          params: {
            field: 'bytes',
            percentile: 95,
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

    expect(dsl.single_percentile.percentiles.field).toEqual('bytes');
    expect(dsl.single_percentile.percentiles.percents).toEqual([95]);
  });

  it('points to right value within multi metric for value bucket path', () => {
    expect(aggConfigs.byId(METRIC_TYPES.SINGLE_PERCENTILE)!.getValueBucketPath()).toEqual(
      `${METRIC_TYPES.SINGLE_PERCENTILE}.95`
    );
  });

  it('converts the response', () => {
    const agg = aggConfigs.getResponseAggs()[0];

    expect(
      agg.getValue({
        [agg.id]: {
          values: {
            '95.0': 123,
          },
        },
      })
    ).toEqual(123);
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
                "single_percentile",
              ],
              "percentile": Array [
                95,
              ],
              "schema": Array [
                "metric",
              ],
            },
            "function": "aggSinglePercentile",
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
          id: METRIC_TYPES.SINGLE_PERCENTILE,
          type: METRIC_TYPES.SINGLE_PERCENTILE,
          schema: 'metric',
          params: {
            field: 'bytes',
            percentile: 95,
          },
        },
      ],
      {
        typesRegistry,
      }
    );

    expect(aggConfigs.toDsl()).toMatchSnapshot();
  });
});
