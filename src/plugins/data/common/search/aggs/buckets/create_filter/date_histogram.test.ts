/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { createFilterDateHistogram } from './date_histogram';
import { intervalOptions, autoInterval } from '../_interval_options';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { IBucketDateHistogramAggConfig } from '../date_histogram';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { RangeFilter } from '../../../../../common';

describe('AggConfig Filters', () => {
  describe('date_histogram', () => {
    let agg: IBucketDateHistogramAggConfig;
    let filter: RangeFilter;
    let bucketStart: any;
    let field: any;

    const init = (
      interval: string = autoInterval,
      duration: any = moment.duration(15, 'minutes')
    ) => {
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
        {
          typesRegistry: mockAggTypesRegistry(),
        }
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

    test('creates a valid range filter', () => {
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

    test('extends the filter edge to 1ms before the next bucket for all interval options', () => {
      intervalOptions.forEach((option) => {
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
        expect(params.lt).toBe(bucketStart.clone().add(interval).toISOString());
      });
    });
  });
});
