/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFilterIpRange } from './ip_range';
import { AggConfigs, CreateAggConfigParams } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { IpFormat } from '@kbn/field-formats-plugin/common';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { RangeFilter } from '@kbn/es-query';

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
      }) as RangeFilter;

      expect(filter.query).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.query.range).toHaveProperty('ip');
      expect(filter.query.range.ip).toHaveProperty('gte', '0.0.0.0');
      expect(filter.query.range.ip).toHaveProperty('lte', '1.1.1.1');
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
      }) as RangeFilter;

      expect(filter.query).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.query.range).toHaveProperty('ip');
      expect(filter.query.range.ip).toHaveProperty('gte', '67.129.65.192');
      expect(filter.query.range.ip).toHaveProperty('lte', '67.129.65.223');
    });
  });
});
