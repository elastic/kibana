/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BytesFormat, FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry, mockGetFieldFormatsStart } from '../../test_helpers';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { createFilterHistogram } from './histogram';
import { RangeFilter } from '@kbn/es-query';

function validateFilter(filter: RangeFilter) {
  expect(mockGetFieldFormatsStart().deserialize).toHaveBeenCalledTimes(1);
  expect(filter).toHaveProperty('meta');
  expect(filter.meta).toHaveProperty('index', '1234');
  expect(filter.query).toHaveProperty('range');
  expect(filter.query.range).toHaveProperty('bytes');
  expect(filter.query.range.bytes).toHaveProperty('gte', 2048);
  expect(filter.query.range.bytes).toHaveProperty('lt', 3072);
  expect(filter.meta).toHaveProperty('formattedValue');
}

describe('AggConfig Filters', () => {
  describe('histogram', () => {
    const getConfig = (() => {}) as FieldFormatsGetConfigFn;
    const getAggConfigs = () => {
      jest.clearAllMocks();
      const field = {
        name: 'bytes',
        format: new BytesFormat({}, getConfig),
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
            id: BUCKET_TYPES.HISTOGRAM,
            type: BUCKET_TYPES.HISTOGRAM,
            schema: 'buckets',
            params: {
              field: 'bytes',
              interval: 1024,
            },
          },
        ],
        { typesRegistry: mockAggTypesRegistry() }
      );
    };

    test('should return an range filter for histogram', () => {
      const aggConfigs = getAggConfigs();
      const filter = createFilterHistogram(mockGetFieldFormatsStart)(
        aggConfigs.aggs[0] as IBucketAggConfig,
        '2048'
      ) as RangeFilter;

      validateFilter(filter);
    });

    test('should work for auto histograms', () => {
      const aggConfigs = getAggConfigs();
      const histogramAggConfig = aggConfigs.aggs[0];
      histogramAggConfig.params.interval = 'auto';
      histogramAggConfig.params.used_interval = 1024;

      const filter = createFilterHistogram(mockGetFieldFormatsStart)(
        histogramAggConfig as IBucketAggConfig,
        '2048'
      ) as RangeFilter;
      validateFilter(filter);
    });
  });
});
