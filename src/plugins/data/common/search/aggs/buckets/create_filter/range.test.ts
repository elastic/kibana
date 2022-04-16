/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RangeFilter } from '@kbn/es-query';
import { BytesFormat, FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry, mockGetFieldFormatsStart } from '../../test_helpers';
import { IBucketAggConfig } from '../bucket_agg_type';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { createFilterRange } from './range';

describe('AggConfig Filters', () => {
  describe('range', () => {
    const getConfig = (() => {}) as FieldFormatsGetConfigFn;
    const getAggConfigs = () => {
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
        getFormatterForField: () => new BytesFormat({}, getConfig),
      } as any;

      return new AggConfigs(
        indexPattern,
        [
          {
            id: BUCKET_TYPES.RANGE,
            type: BUCKET_TYPES.RANGE,
            schema: 'buckets',
            params: {
              field: 'bytes',
              ranges: [{ from: 1024, to: 2048 }],
            },
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry(),
        }
      );
    };

    test('should return a range filter for range agg', () => {
      const aggConfigs = getAggConfigs();
      const filter = createFilterRange(mockGetFieldFormatsStart)(
        aggConfigs.aggs[0] as IBucketAggConfig,
        {
          gte: 1024,
          lt: 2048.0,
          label: 'A custom label',
        }
      ) as RangeFilter;

      expect(mockGetFieldFormatsStart().deserialize).toHaveBeenCalledTimes(1);
      expect(filter.query).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.query.range).toHaveProperty('bytes');
      expect(filter.query.range.bytes).toHaveProperty('gte', 1024.0);
      expect(filter.query.range.bytes).toHaveProperty('lt', 2048.0);
      expect(filter.query.range.bytes).not.toHaveProperty('label');
      expect(filter.meta).toHaveProperty('formattedValue');
    });
  });
});
