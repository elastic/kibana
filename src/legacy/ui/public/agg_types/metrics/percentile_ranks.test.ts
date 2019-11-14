/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IPercentileRanksAggConfig, percentileRanksMetricAgg } from './percentile_ranks';
import { AggConfigs } from '../agg_configs';
import { METRIC_TYPES } from './metric_agg_types';

jest.mock('ui/new_platform');

describe('AggTypesMetricsPercentileRanksProvider class', function() {
  let aggConfigs: AggConfigs;

  beforeEach(() => {
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
            field: {
              displayName: 'bytes',
              format: {
                convert: jest.fn(x => x),
              },
            },
            customLabel: 'my custom field label',
            values: [5000, 10000],
          },
        },
      ],
      null
    );
  });

  it('uses the custom label if it is set', function() {
    const responseAggs: any = percentileRanksMetricAgg.getResponseAggs(
      aggConfigs.aggs[0] as IPercentileRanksAggConfig
    );

    const percentileRankLabelFor5kBytes = responseAggs[0].makeLabel();
    const percentileRankLabelFor10kBytes = responseAggs[1].makeLabel();

    expect(percentileRankLabelFor5kBytes).toBe('Percentile rank 5000 of "my custom field label"');
    expect(percentileRankLabelFor10kBytes).toBe('Percentile rank 10000 of "my custom field label"');
  });
});
