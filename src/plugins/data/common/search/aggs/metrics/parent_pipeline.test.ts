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

import { getDerivativeMetricAgg } from './derivative';
import { getCumulativeSumMetricAgg } from './cumulative_sum';
import { getMovingAvgMetricAgg } from './moving_avg';
import { getSerialDiffMetricAgg } from './serial_diff';
import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { IMetricAggConfig, MetricAggType } from './metric_agg_type';

describe('parent pipeline aggs', function () {
  const typesRegistry = mockAggTypesRegistry();

  const metrics = [
    {
      name: 'derivative',
      title: 'Derivative',
      provider: getDerivativeMetricAgg(),
    },
    {
      name: 'cumulative_sum',
      title: 'Cumulative Sum',
      provider: getCumulativeSumMetricAgg(),
    },
    {
      name: 'moving_avg',
      title: 'Moving Avg',
      provider: getMovingAvgMetricAgg(),
      dslName: 'moving_fn',
    },
    {
      name: 'serial_diff',
      title: 'Serial Diff',
      provider: getSerialDiffMetricAgg(),
    },
  ];

  metrics.forEach((metric) => {
    describe(`${metric.title} metric`, () => {
      let aggDsl: Record<string, any>;
      let metricAgg: MetricAggType;
      let aggConfig: IMetricAggConfig;

      const init = (
        params: any = {
          metricAgg: '1',
          customMetric: null,
        }
      ) => {
        const field = {
          name: 'field',
          format: {
            toJSON: () => ({ id: 'bytes' }),
          },
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
              id: '1',
              type: 'count',
              schema: 'metric',
            },
            {
              id: '2',
              type: metric.name,
              schema: 'metric',
              params,
            },
            {
              id: '3',
              type: 'max',
              params: { field: 'field' },
              schema: 'metric',
            },
          ],
          { typesRegistry }
        );

        // Grab the aggConfig off the vis (we don't actually use the vis for anything else)
        metricAgg = metric.provider;
        aggConfig = aggConfigs.aggs[1] as IMetricAggConfig;
        aggDsl = aggConfig.toDsl(aggConfigs);
      };

      it(`should return a label prefixed with ${metric.title} of`, () => {
        init();

        expect(metricAgg.makeLabel(aggConfig)).toEqual(`${metric.title} of Count`);
      });

      it(`should return a label ${metric.title} of max bytes`, () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '1-orderAgg',
            type: 'max',
            params: { field: 'field' },
            schema: 'orderAgg',
          },
        });
        expect(metricAgg.makeLabel(aggConfig)).toEqual(`${metric.title} of Max field`);
      });

      it(`should return a label prefixed with number of ${metric.title.toLowerCase()}`, () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-orderAgg',
            type: metric.name,
            params: {
              buckets_path: 'custom',
              customMetric: {
                id: '2-orderAgg-orderAgg',
                type: 'count',
                schema: 'orderAgg',
              },
            },
            schema: 'orderAgg',
          },
        });
        expect(metricAgg.makeLabel(aggConfig)).toEqual(`2. ${metric.title.toLowerCase()} of Count`);
      });

      it('should set parent aggs', () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: 'max',
            params: { field: 'field' },
            schema: 'orderAgg',
          },
        });
        expect(aggDsl[metric.dslName || metric.name].buckets_path).toBe('2-metric');
        expect(aggDsl.parentAggs['2-metric'].max.field).toBe('field');
      });

      it('should set nested parent aggs', () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: metric.name,
            params: {
              buckets_path: 'custom',
              customMetric: {
                id: '2-metric-metric',
                type: 'max',
                params: { field: 'field' },
                schema: 'orderAgg',
              },
            },
            schema: 'orderAgg',
          },
        });
        expect(aggDsl[metric.dslName || metric.name].buckets_path).toBe('2-metric');
        expect(aggDsl.parentAggs['2-metric'][metric.dslName || metric.name].buckets_path).toBe(
          '2-metric-metric'
        );
      });

      it('should have correct serialized format', () => {
        init({
          metricAgg: '3',
        });
        expect(metricAgg.getSerializedFormat(aggConfig).id).toBe('bytes');
      });

      it('should have correct customMetric nested serialized format', () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: metric.name,
            params: {
              buckets_path: 'custom',
              customMetric: {
                id: '2-metric-metric',
                type: 'max',
                params: { field: 'field' },
                schema: 'orderAgg',
              },
            },
            schema: 'orderAgg',
          },
        });
        expect(metricAgg.getSerializedFormat(aggConfig).id).toBe('bytes');
      });

      it("should call modifyAggConfigOnSearchRequestStart for its customMetric's parameters", () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: 'max',
            params: { field: 'field' },
            schema: 'orderAgg',
          },
        });

        const searchSource: any = {};
        const customMetricSpy = jest.fn();
        const customMetric = aggConfig.params.customMetric;

        // Attach a modifyAggConfigOnSearchRequestStart with a spy to the first parameter
        customMetric.type.params[0].modifyAggConfigOnSearchRequestStart = customMetricSpy;

        aggConfig.type.params.forEach((param) => {
          param.modifyAggConfigOnSearchRequestStart(aggConfig, searchSource, {});
        });
        expect(customMetricSpy.mock.calls[0]).toEqual([customMetric, searchSource, {}]);
      });
    });
  });
});
