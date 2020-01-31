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

import expect from '@kbn/expect';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { bucketSumMetricAgg } from '../../metrics/bucket_sum';
import { bucketAvgMetricAgg } from '../../metrics/bucket_avg';
import { bucketMinMetricAgg } from '../../metrics/bucket_min';
import { bucketMaxMetricAgg } from '../../metrics/bucket_max';
import { VisProvider } from '../../../vis';
import StubbedIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

const metrics = [
  { name: 'sum_bucket', title: 'Overall Sum', provider: bucketSumMetricAgg },
  { name: 'avg_bucket', title: 'Overall Average', provider: bucketAvgMetricAgg },
  { name: 'min_bucket', title: 'Overall Min', provider: bucketMinMetricAgg },
  { name: 'max_bucket', title: 'Overall Max', provider: bucketMaxMetricAgg },
];

describe('sibling pipeline aggs', function() {
  metrics.forEach(metric => {
    describe(`${metric.title} metric`, function() {
      let aggDsl;
      let metricAgg;
      let aggConfig;

      function init(settings) {
        ngMock.module('kibana');
        ngMock.inject(function(Private) {
          const Vis = Private(VisProvider);
          const indexPattern = Private(StubbedIndexPattern);
          indexPattern.stubSetFieldFormat('bytes', 'bytes');
          metricAgg = metric.provider;

          const params = settings || {
            customMetric: {
              id: '5',
              type: 'count',
              schema: 'metric',
            },
            customBucket: {
              id: '6',
              type: 'date_histogram',
              schema: 'bucket',
              params: { field: '@timestamp', interval: '10s' },
            },
          };

          const vis = new Vis(indexPattern, {
            title: 'New Visualization',
            type: 'metric',
            params: {
              fontSize: 60,
            },
            aggs: [
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
            ],
            listeners: {},
          });

          // Grab the aggConfig off the vis (we don't actually use the vis for anything else)
          aggConfig = vis.aggs.aggs[1];
          aggDsl = aggConfig.toDsl(vis.aggs);
        });
      }

      it(`should return a label prefixed with ${metric.title} of`, function() {
        init();
        expect(metricAgg.makeLabel(aggConfig)).to.eql(`${metric.title} of Count`);
      });

      it('should set parent aggs', function() {
        init();
        expect(aggDsl[metric.name].buckets_path).to.be('2-bucket>_count');
        expect(aggDsl.parentAggs['2-bucket'].date_histogram).to.not.be.undefined;
      });

      it('should set nested parent aggs', function() {
        init({
          customMetric: {
            id: '5',
            type: 'avg',
            schema: 'metric',
            params: { field: 'bytes' },
          },
          customBucket: {
            id: '6',
            type: 'date_histogram',
            schema: 'bucket',
            params: { field: '@timestamp', interval: '10s' },
          },
        });
        expect(aggDsl[metric.name].buckets_path).to.be('2-bucket>2-metric');
        expect(aggDsl.parentAggs['2-bucket'].date_histogram).to.not.be.undefined;
        expect(aggDsl.parentAggs['2-bucket'].aggs['2-metric'].avg.field).to.equal('bytes');
      });

      it('should have correct formatter', function() {
        init({
          customMetric: {
            id: '5',
            type: 'avg',
            schema: 'metric',
            params: { field: 'bytes' },
          },
          customBucket: {
            id: '6',
            type: 'date_histogram',
            schema: 'bucket',
            params: { field: '@timestamp', interval: '10s' },
          },
        });
        expect(metricAgg.getFormat(aggConfig).type.id).to.be('bytes');
      });

      it("should call modifyAggConfigOnSearchRequestStart for nested aggs' parameters", () => {
        init();

        const searchSource = {};
        const request = {};
        const customMetricSpy = sinon.spy();
        const customBucketSpy = sinon.spy();
        const { customMetric, customBucket } = aggConfig.params;

        // Attach a modifyAggConfigOnSearchRequestStart with a spy to the first parameter
        customMetric.type.params[0].modifyAggConfigOnSearchRequestStart = customMetricSpy;
        customBucket.type.params[0].modifyAggConfigOnSearchRequestStart = customBucketSpy;

        aggConfig.type.params.forEach(param => {
          param.modifyAggConfigOnSearchRequestStart(aggConfig, searchSource, request);
        });
        expect(customMetricSpy.calledWith(customMetric, searchSource, request)).to.be(true);
        expect(customBucketSpy.calledWith(customBucket, searchSource, request)).to.be(true);
      });
    });
  });
});
