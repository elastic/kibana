/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFilterIpPrefix } from './ip_prefix';
import { AggConfigs, CreateAggConfigParams } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { IpFormat } from '@kbn/field-formats-plugin/common';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { RangeFilter } from '@kbn/es-query';

describe('AggConfig Filters', () => {
  describe('IP prefix', () => {
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

      return new AggConfigs(indexPattern, aggs, { typesRegistry }, jest.fn());
    };

    test('should return a range filter for ip_prefix agg - ipv4', () => {
      const aggConfigs = getAggConfigs([
        {
          type: BUCKET_TYPES.IP_PREFIX,
          schema: 'segment',
          params: {
            field: 'ip',
            address: '10.0.0.0',
            prefix_length: 8,
          },
        },
      ]);

      const filter = createFilterIpPrefix(aggConfigs.aggs[0] as IBucketAggConfig, {
        type: 'ip_prefix',
        address: '10.0.0.0',
        prefix_length: 8,
      }) as RangeFilter;

      expect(filter.query).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.query.range).toHaveProperty('ip');
      expect(filter.query.range.ip).toHaveProperty('gte', '10.0.0.0');
      expect(filter.query.range.ip).toHaveProperty('lte', '10.255.255.255');
    });

    test('should return a range filter for ip_prefix agg - ipv4 mapped to ipv6', () => {
      const aggConfigs = getAggConfigs([
        {
          type: BUCKET_TYPES.IP_PREFIX,
          schema: 'segment',
          params: {
            field: 'ip',
            address: '0.0.0.0',
            prefix_length: 96,
          },
        },
      ]);

      const filter = createFilterIpPrefix(aggConfigs.aggs[0] as IBucketAggConfig, {
        type: 'ip_prefix',
        address: '0.0.0.0',
        prefix_length: 96,
      }) as RangeFilter;

      expect(filter.query).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.query.range).toHaveProperty('ip');
      expect(filter.query.range.ip).toHaveProperty('gte', '::ffff:0:0');
      expect(filter.query.range.ip).toHaveProperty('lte', '::ffff:ffff:ffff');
    });

    test('should return a range filter for ip_prefix agg - ipv6', () => {
      const aggConfigs = getAggConfigs([
        {
          type: BUCKET_TYPES.IP_PREFIX,
          schema: 'segment',
          params: {
            field: 'ip',
            address: '1989:1337:c0de:7e57::',
            prefix_length: 56,
          },
        },
      ]);

      const filter = createFilterIpPrefix(aggConfigs.aggs[0] as IBucketAggConfig, {
        type: 'ip_prefix',
        address: '1989:1337:c0de:7e57::',
        prefix_length: 56,
      }) as RangeFilter;

      expect(filter.query).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.query.range).toHaveProperty('ip');
      expect(filter.query.range.ip).toHaveProperty('gte', '1989:1337:c0de:7e00::');
      expect(filter.query.range.ip).toHaveProperty(
        'lte',
        '1989:1337:c0de:7eff:ffff:ffff:ffff:ffff'
      );
    });
  });
});
