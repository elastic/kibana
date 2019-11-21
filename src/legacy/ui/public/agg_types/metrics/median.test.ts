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

import { AggConfigs } from '../agg_configs';
import { METRIC_TYPES } from './metric_agg_types';

jest.mock('ui/new_platform');

describe('AggTypeMetricMedianProvider class', () => {
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
          id: METRIC_TYPES.MEDIAN,
          type: METRIC_TYPES.MEDIAN,
          schema: 'metric',
          params: {
            field: 'bytes',
            percents: [70],
          },
        },
      ],
      null
    );
  });

  it('requests the percentiles aggregation in the Elasticsearch query DSL', () => {
    const dsl: Record<string, any> = aggConfigs.toDsl();

    expect(dsl.median.percentiles.percents).toEqual([70]);
  });

  it('asks Elasticsearch for array-based values in the aggregation response', () => {
    const dsl: Record<string, any> = aggConfigs.toDsl();

    expect(dsl.median.percentiles.keyed).toBeFalsy();
  });
});
