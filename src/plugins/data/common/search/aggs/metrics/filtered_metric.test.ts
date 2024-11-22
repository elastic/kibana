/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggConfigs, IAggConfigs } from '../agg_configs';
import { AggTypesDependencies } from '../agg_types';
import { mockAggTypesDependencies, mockAggTypesRegistry } from '../test_helpers';
import { getFilteredMetricAgg } from './filtered_metric';
import { IMetricAggConfig } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';

describe('filtered metric agg type', () => {
  let aggConfigs: IAggConfigs;
  let aggTypesDependencies: AggTypesDependencies;
  const typesRegistry = mockAggTypesRegistry();
  const field = {
    name: 'bytes',
    filterable: true,
  };
  const indexPattern = {
    id: '1234',
    title: 'logstash-*',
    fields: {
      getByName: () => field,
      filter: () => [field],
      find: () => field,
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    aggTypesDependencies = {
      ...mockAggTypesDependencies,
      getConfig: jest.fn(),
    };

    aggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: METRIC_TYPES.FILTERED_METRIC,
          type: METRIC_TYPES.FILTERED_METRIC,
          schema: 'metric',
          params: {
            customBucket: {
              type: 'filter',
              params: {
                filter: { language: 'kuery', query: 'a: b' },
              },
            },
            customMetric: {
              type: 'cardinality',
              params: {
                field: 'bytes',
              },
            },
          },
        },
      ],
      {
        typesRegistry,
      },
      jest.fn()
    );
  });

  it('converts the response', () => {
    const agg = aggConfigs.getResponseAggs()[0];

    expect(
      agg.getValue({
        'filtered_metric-bucket': {
          'filtered_metric-metric': {
            value: 10,
          },
        },
      })
    ).toEqual(10);
  });

  it('provides the id of the inner filter bucket to look up the agg config in the response object', () => {
    const agg = aggConfigs.getResponseAggs()[0];

    expect(agg.getResponseId()).toEqual('filtered_metric-bucket');
  });
  it.each`
    aggType
    ${'top_metrics'}
    ${'top_hits'}
  `('returns phrase filter for filtered metric for $aggType', ({ aggType }) => {
    const topMetricsAggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: METRIC_TYPES.FILTERED_METRIC,
          type: METRIC_TYPES.FILTERED_METRIC,
          schema: 'metric',
          params: {
            customBucket: {
              type: 'filter',
              params: {
                filter: { language: 'kuery', query: 'a: b' },
              },
            },
            customMetric: {
              type: aggType,
              params: {
                field: 'bytes',
              },
            },
          },
        },
      ],
      {
        typesRegistry,
      },
      jest.fn()
    );

    expect(
      getFilteredMetricAgg(aggTypesDependencies).createFilter!(
        topMetricsAggConfigs.aggs[0] as IMetricAggConfig,
        10
      ).query.match_phrase
    ).toEqual({ bytes: 10 });
  });
  it('returns filter from the custom bucket filter parameter for metric', () => {
    expect(
      getFilteredMetricAgg(aggTypesDependencies).createFilter!(
        aggConfigs.aggs[0] as IMetricAggConfig,
        '10'
      ).query.bool.filter[0].bool.should[0].match
    ).toEqual({ bytes: 'b' });
  });
});
