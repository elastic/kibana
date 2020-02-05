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

import { npStart } from 'ui/new_platform';
import { AggConfigs } from '../index';
import { BUCKET_TYPES } from './bucket_agg_types';
import { IBucketHistogramAggConfig, histogramBucketAgg, AutoBounds } from './histogram';
import { BucketAggType } from './_bucket_agg_type';

jest.mock('ui/new_platform');

describe('Histogram Agg', () => {
  const getAggConfigs = (params: Record<string, any> = {}) => {
    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
    } as any;

    const field = {
      name: 'field',
      indexPattern,
    };

    return new AggConfigs(
      indexPattern,
      [
        {
          field: {
            name: 'field',
          },
          id: 'test',
          type: BUCKET_TYPES.HISTOGRAM,
          schema: 'segment',
          params,
        },
      ],
      null
    );
  };

  const getParams = (options: Record<string, any>) => {
    const aggConfigs = getAggConfigs({
      ...options,
      field: {
        name: 'field',
      },
    });
    return aggConfigs.aggs[0].toDsl()[BUCKET_TYPES.HISTOGRAM];
  };

  describe('ordered', () => {
    let histogramType: BucketAggType<IBucketHistogramAggConfig>;

    beforeEach(() => {
      histogramType = histogramBucketAgg;
    });

    it('is ordered', () => {
      expect(histogramType.ordered).toBeDefined();
    });

    it('is not ordered by date', () => {
      expect(histogramType.ordered).not.toHaveProperty('date');
    });
  });

  describe('params', () => {
    describe('intervalBase', () => {
      it('should not be written to the DSL', () => {
        const aggConfigs = getAggConfigs({
          intervalBase: 100,
          field: {
            name: 'field',
          },
        });
        const { [BUCKET_TYPES.HISTOGRAM]: params } = aggConfigs.aggs[0].toDsl();

        expect(params).not.toHaveProperty('intervalBase');
      });
    });

    describe('interval', () => {
      it('accepts a whole number', () => {
        const params = getParams({
          interval: 100,
        });

        expect(params).toHaveProperty('interval', 100);
      });

      it('accepts a decimal number', function() {
        const params = getParams({
          interval: 0.1,
        });

        expect(params).toHaveProperty('interval', 0.1);
      });

      it('accepts a decimal number string', function() {
        const params = getParams({
          interval: '0.1',
        });

        expect(params).toHaveProperty('interval', 0.1);
      });

      it('accepts a whole number string', function() {
        const params = getParams({
          interval: '10',
        });

        expect(params).toHaveProperty('interval', 10);
      });

      it('fails on non-numeric values', function() {
        const params = getParams({
          interval: [],
        });

        expect(params.interval).toBeNaN();
      });

      describe('interval scaling', () => {
        const getInterval = (
          maxBars: number,
          params?: Record<string, any>,
          autoBounds?: AutoBounds
        ) => {
          const aggConfigs = getAggConfigs({
            ...params,
            field: {
              name: 'field',
            },
          });
          const aggConfig = aggConfigs.aggs[0] as IBucketHistogramAggConfig;

          if (autoBounds) {
            aggConfig.setAutoBounds(autoBounds);
          }

          // mock histogram:maxBars value;
          npStart.core.uiSettings.get = jest.fn(() => maxBars as any);

          return aggConfig.write(aggConfigs).params;
        };

        it('will respect the histogram:maxBars setting', () => {
          const params = getInterval(
            5,
            { interval: 5 },
            {
              min: 0,
              max: 10000,
            }
          );

          expect(params).toHaveProperty('interval', 2000);
        });

        it('will return specified interval, if bars are below histogram:maxBars config', () => {
          const params = getInterval(100, { interval: 5 });

          expect(params).toHaveProperty('interval', 5);
        });

        it('will set to intervalBase if interval is below base', () => {
          const params = getInterval(1000, { interval: 3, intervalBase: 8 });

          expect(params).toHaveProperty('interval', 8);
        });

        it('will round to nearest intervalBase multiple if interval is above base', () => {
          const roundUp = getInterval(1000, { interval: 46, intervalBase: 10 });
          expect(roundUp).toHaveProperty('interval', 50);

          const roundDown = getInterval(1000, { interval: 43, intervalBase: 10 });
          expect(roundDown).toHaveProperty('interval', 40);
        });

        it('will not change interval if it is a multiple of base', () => {
          const output = getInterval(1000, { interval: 35, intervalBase: 5 });

          expect(output).toHaveProperty('interval', 35);
        });

        it('will round to intervalBase after scaling histogram:maxBars', () => {
          const output = getInterval(100, { interval: 5, intervalBase: 6 }, { min: 0, max: 1000 });

          // 100 buckets in 0 to 1000 would result in an interval of 10, so we should
          // round to the next multiple of 6 -> 12
          expect(output).toHaveProperty('interval', 12);
        });
      });

      describe('min_doc_count', () => {
        let output: Record<string, any>;

        it('casts true values to 0', () => {
          output = getParams({ min_doc_count: true });
          expect(output).toHaveProperty('min_doc_count', 0);

          output = getParams({ min_doc_count: 'yes' });
          expect(output).toHaveProperty('min_doc_count', 0);

          output = getParams({ min_doc_count: 1 });
          expect(output).toHaveProperty('min_doc_count', 0);

          output = getParams({ min_doc_count: {} });
          expect(output).toHaveProperty('min_doc_count', 0);
        });

        it('writes 1 for falsy values', () => {
          output = getParams({ min_doc_count: '' });
          expect(output).toHaveProperty('min_doc_count', 1);

          output = getParams({ min_doc_count: null });
          expect(output).toHaveProperty('min_doc_count', 1);

          output = getParams({ min_doc_count: undefined });
          expect(output).toHaveProperty('min_doc_count', 1);
        });
      });

      describe('extended_bounds', function() {
        it('does not write when only eb.min is set', function() {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: { min: 0 },
          });
          expect(output).not.toHaveProperty('extended_bounds');
        });

        it('does not write when only eb.max is set', function() {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: { max: 0 },
          });

          expect(output).not.toHaveProperty('extended_bounds');
        });

        it('writes when both eb.min and eb.max are set', function() {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: { min: 99, max: 100 },
          });

          expect(output.extended_bounds).toHaveProperty('min', 99);
          expect(output.extended_bounds).toHaveProperty('max', 100);
        });

        it('does not write when nothing is set', function() {
          const output = getParams({
            has_extended_bounds: true,
            extended_bounds: {},
          });

          expect(output).not.toHaveProperty('extended_bounds');
        });

        it('does not write when has_extended_bounds is false', function() {
          const output = getParams({
            has_extended_bounds: false,
            extended_bounds: { min: 99, max: 100 },
          });

          expect(output).not.toHaveProperty('extended_bounds');
        });
      });
    });
  });
});
