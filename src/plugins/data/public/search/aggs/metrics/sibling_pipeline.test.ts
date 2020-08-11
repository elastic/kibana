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

import { getBucketSumMetricAgg } from './bucket_sum';
import { getBucketAvgMetricAgg } from './bucket_avg';
import { getBucketMinMetricAgg } from './bucket_min';
import { getBucketMaxMetricAgg } from './bucket_max';

import { AggConfigs } from '../agg_configs';
import { IMetricAggConfig, MetricAggType } from './metric_agg_type';
import { mockAggTypesRegistry } from '../test_helpers';

describe('sibling pipeline aggs', () => {
  const typesRegistry = mockAggTypesRegistry();

  const metrics = [
    {
      name: 'sum_bucket',
      title: 'Overall Sum',
      provider: getBucketSumMetricAgg(),
    },
    {
      name: 'avg_bucket',
      title: 'Overall Average',
      provider: getBucketAvgMetricAgg(),
    },
    {
      name: 'min_bucket',
      title: 'Overall Min',
      provider: getBucketMinMetricAgg(),
    },
    {
      name: 'max_bucket',
      title: 'Overall Max',
      provider: getBucketMaxMetricAgg(),
    },
  ];

  metrics.forEach((metric) => {
    describe(`${metric.title} metric`, () => {
      let aggDsl: Record<string, any>;
      let metricAgg: MetricAggType;
      let aggConfig: IMetricAggConfig;

      const init = (settings?: any) => {
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
              params: settings || {
                customMetric: {
                  id: '5',
                  type: 'count',
                  schema: 'metric',
                },
                customBucket: {
                  id: '6',
                  type: 'date_histogram',
                  schema: 'bucket',
                  params: { field: 'field', interval: '10s' },
                },
              },
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

      it('should set parent aggs', function () {
        init();

        expect(aggDsl[metric.name].buckets_path).toBe('2-bucket>_count');
        expect(aggDsl.parentAggs['2-bucket'].date_histogram).not.toBeUndefined();
      });

      it('should set nested parent aggs', () => {
        init({
          customMetric: {
            id: '5',
            type: 'avg',
            schema: 'metric',
            params: { field: 'field' },
          },
          customBucket: {
            id: '6',
            type: 'date_histogram',
            schema: 'bucket',
            params: { field: 'field', interval: '10s' },
          },
        });

        expect(aggDsl[metric.name].buckets_path).toBe('2-bucket>2-metric');
        expect(aggDsl.parentAggs['2-bucket'].date_histogram).not.toBeUndefined();
        expect(aggDsl.parentAggs['2-bucket'].aggs['2-metric'].avg.field).toEqual('field');
      });

      it('should have correct serialized field format', () => {
        init({
          customMetric: {
            id: '5',
            type: 'avg',
            schema: 'metric',
            params: { field: 'field' },
          },
          customBucket: {
            id: '6',
            type: 'date_histogram',
            schema: 'bucket',
            params: { field: 'field', interval: '10s' },
          },
        });

        expect(metricAgg.getSerializedFormat(aggConfig).id).toBe('bytes');
      });

      it("should call modifyAggConfigOnSearchRequestStart for nested aggs' parameters", () => {
        init();

        const searchSource: any = {};
        const customMetricSpy = jest.fn();
        const customBucketSpy = jest.fn();
        const { customMetric, customBucket } = aggConfig.params;

        // Attach a modifyAggConfigOnSearchRequestStart with a spy to the first parameter
        customMetric.type.params[0].modifyAggConfigOnSearchRequestStart = customMetricSpy;
        customBucket.type.params[0].modifyAggConfigOnSearchRequestStart = customBucketSpy;

        aggConfig.type.params.forEach((param) => {
          param.modifyAggConfigOnSearchRequestStart(aggConfig, searchSource, {});
        });

        expect(customMetricSpy.mock.calls[0]).toEqual([customMetric, searchSource, {}]);
        expect(customBucketSpy.mock.calls[0]).toEqual([customBucket, searchSource, {}]);
      });
    });
  });
});
