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

describe('filtered metric agg type', () => {
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
      }
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
});
