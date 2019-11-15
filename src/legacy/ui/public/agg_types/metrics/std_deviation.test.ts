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

import { IStdDevAggConfig, stdDeviationMetricAgg } from './std_deviation';
import { AggConfigs } from '../agg_configs';
import { METRIC_TYPES } from './metric_agg_types';

jest.mock('ui/new_platform');

describe('AggTypeMetricStandardDeviationProvider class', () => {
  const getAggConfigs = (customLabel?: string) => {
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
          },
        },
      ],
      null
    );
  };

  it('uses the custom label if it is set', () => {
    const aggConfigs = getAggConfigs('custom label');
    const responseAggs: any = stdDeviationMetricAgg.getResponseAggs(
      aggConfigs.aggs[0] as IStdDevAggConfig
    );

    const lowerStdDevLabel = responseAggs[0].makeLabel();
    const upperStdDevLabel = responseAggs[1].makeLabel();

    expect(lowerStdDevLabel).toBe('Lower custom label');
    expect(upperStdDevLabel).toBe('Upper custom label');
  });

  it('uses the default labels if custom label is not set', () => {
    const aggConfigs = getAggConfigs();

    const responseAggs: any = stdDeviationMetricAgg.getResponseAggs(
      aggConfigs.aggs[0] as IStdDevAggConfig
    );

    const lowerStdDevLabel = responseAggs[0].makeLabel();
    const upperStdDevLabel = responseAggs[1].makeLabel();

    expect(lowerStdDevLabel).toBe('Lower Standard Deviation of memory');
    expect(upperStdDevLabel).toBe('Upper Standard Deviation of memory');
  });
});
