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

import { getIpRangeBucketAgg } from '../ip_range';
import { createFilterIpRange } from './ip_range';
import { AggConfigs, CreateAggConfigParams } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { IpFormat } from '../../../../../common';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { fieldFormatsServiceMock } from '../../../../field_formats/mocks';
import { notificationServiceMock } from '../../../../../../../core/public/mocks';
import { InternalStartServices } from '../../../../types';

describe('AggConfig Filters', () => {
  describe('IP range', () => {
    const fieldFormats = fieldFormatsServiceMock.createStartContract();
    const typesRegistry = mockAggTypesRegistry([
      getIpRangeBucketAgg({
        getInternalStartServices: () =>
          (({
            fieldFormats,
            notifications: notificationServiceMock.createStartContract(),
          } as unknown) as InternalStartServices),
      }),
    ]);
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

      return new AggConfigs(indexPattern, aggs, { typesRegistry, fieldFormats });
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
