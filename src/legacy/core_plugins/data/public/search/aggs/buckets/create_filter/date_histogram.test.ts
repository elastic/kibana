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

import moment from 'moment';
import { createFilterDateHistogram } from './date_histogram';
import { intervalOptions } from '../_interval_options';
import { AggConfigs } from '../../agg_configs';
import { IBucketDateHistogramAggConfig } from '../date_histogram';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { RangeFilter } from '../../../../../../../../plugins/data/public';

jest.mock('ui/new_platform');

describe('AggConfig Filters', () => {
  describe('date_histogram', () => {
    let agg: IBucketDateHistogramAggConfig;
    let filter: RangeFilter;
    let bucketStart: any;
    let field: any;

    const init = (interval: string = 'auto', duration: any = moment.duration(15, 'minutes')) => {
      field = {
        name: 'date',
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
      } as any;
      const aggConfigs = new AggConfigs(
        indexPattern,
        [
          {
            type: BUCKET_TYPES.DATE_HISTOGRAM,
            schema: 'segment',
            params: { field: field.name, interval, customInterval: '5d' },
          },
        ],
        null
      );
      const bucketKey = 1422579600000;

      agg = aggConfigs.aggs[0] as IBucketDateHistogramAggConfig;
      bucketStart = moment(bucketKey);

      const timePad = moment.duration(duration / 2);

      agg.buckets.setBounds({
        min: bucketStart.clone().subtract(timePad),
        max: bucketStart.clone().add(timePad),
      });
      agg.buckets.setInterval(interval);
      filter = createFilterDateHistogram(agg, bucketKey);
    };

    it('creates a valid range filter', () => {
      init();

      expect(filter).toHaveProperty('range');
      expect(filter.range).toHaveProperty(field.name);

      const fieldParams = filter.range[field.name];
      expect(fieldParams).toHaveProperty('gte');
      expect(typeof fieldParams.gte).toBe('string');

      expect(fieldParams).toHaveProperty('lt');
      expect(typeof fieldParams.lt).toBe('string');

      expect(fieldParams).toHaveProperty('format');
      expect(fieldParams.format).toBe('strict_date_optional_time');

      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
    });

    it('extends the filter edge to 1ms before the next bucket for all interval options', () => {
      intervalOptions.forEach(option => {
        let duration;
        if (option.val !== 'custom' && moment(1, option.val).isValid()) {
          // @ts-ignore
          duration = moment.duration(10, option.val);

          if (+duration < 10) {
            throw new Error('unable to create interval for ' + option.val);
          }
        }
        init(option.val, duration);

        const interval = agg.buckets.getInterval();
        const params = filter.range[field.name];

        expect(params.gte).toBe(bucketStart.toISOString());
        expect(params.lt).toBe(
          bucketStart
            .clone()
            .add(interval)
            .toISOString()
        );
      });
    });
  });
});
