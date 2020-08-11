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

import { IPercentileAggConfig, getPercentilesMetricAgg } from './percentiles';
import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { METRIC_TYPES } from './metric_agg_types';

describe('AggTypesMetricsPercentilesProvider class', () => {
  let aggConfigs: IAggConfigs;

  beforeEach(() => {
    const typesRegistry = mockAggTypesRegistry([getPercentilesMetricAgg()]);
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
});
