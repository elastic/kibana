/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { createFilterDateRange } from './date_range';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';

describe('AggConfig Filters', () => {
  describe('Date range', () => {
    const getAggConfigs = () => {
      const field = {
        name: '@timestamp',
        format: {},
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
            type: BUCKET_TYPES.DATE_RANGE,
            params: {
              field: '@timestamp',
              ranges: [{ from: '2014-01-01', to: '2014-12-31' }],
            },
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry(),
        }
      );
    };

    test('should return a range filter for date_range agg', () => {
      const aggConfigs = getAggConfigs();
      const from = new Date('1 Feb 2015');
      const to = new Date('7 Feb 2015');
      const filter = createFilterDateRange(aggConfigs.aggs[0] as IBucketAggConfig, {
        from: from.valueOf(),
        to: to.valueOf(),
      });

      expect(filter).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.range).toHaveProperty('@timestamp');
      expect(filter.range['@timestamp']).toHaveProperty('gte', moment(from).toISOString());
      expect(filter.range['@timestamp']).toHaveProperty('lt', moment(to).toISOString());
    });
  });
});
