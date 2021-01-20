/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createFilterIpRange } from './ip_range';
import { AggConfigs, CreateAggConfigParams } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { IpFormat } from '../../../../../common';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';

describe('AggConfig Filters', () => {
  describe('IP range', () => {
    const typesRegistry = mockAggTypesRegistry();
    const getAggConfigs = (aggs: CreateAggConfigParams[]) => {
      const field = {
        name: 'ip',
        format: IpFormat,
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
      } as any;

      return new AggConfigs(indexPattern, aggs, { typesRegistry });
    };

    test('should return a range filter for ip_range agg', () => {
      const aggConfigs = getAggConfigs([
        {
          type: BUCKET_TYPES.IP_RANGE,
          schema: 'segment',
          params: {
            field: 'ip',
            ipRangeType: 'range',
            ranges: {
              fromTo: [{ from: '0.0.0.0', to: '1.1.1.1' }],
            },
          },
        },
      ]);

      const filter = createFilterIpRange(aggConfigs.aggs[0] as IBucketAggConfig, {
        type: 'range',
        from: '0.0.0.0',
        to: '1.1.1.1',
      });

      expect(filter).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.range).toHaveProperty('ip');
      expect(filter.range.ip).toHaveProperty('gte', '0.0.0.0');
      expect(filter.range.ip).toHaveProperty('lte', '1.1.1.1');
    });

    test('should return a range filter for ip_range agg using a CIDR mask', () => {
      const aggConfigs = getAggConfigs([
        {
          type: BUCKET_TYPES.IP_RANGE,
          schema: 'segment',
          params: {
            field: 'ip',
            ipRangeType: 'mask',
            ranges: {
              mask: [{ mask: '67.129.65.201/27' }],
            },
          },
        },
      ]);

      const filter = createFilterIpRange(aggConfigs.aggs[0] as IBucketAggConfig, {
        type: 'mask',
        mask: '67.129.65.201/27',
      });

      expect(filter).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.range).toHaveProperty('ip');
      expect(filter.range.ip).toHaveProperty('gte', '67.129.65.192');
      expect(filter.range.ip).toHaveProperty('lte', '67.129.65.223');
    });
  });
});
