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
import { derivativeMetricAgg } from '../../metrics/derivative';
import { cumulativeSumMetricAgg } from '../../metrics/cumulative_sum';
import { movingAvgMetricAgg } from '../../metrics/moving_avg';
import { serialDiffMetricAgg } from '../../metrics/serial_diff';
import { VisProvider } from '../../../vis';
import StubbedIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

const metrics = [
  { name: 'derivative', title: 'Derivative', agg: derivativeMetricAgg },
  { name: 'cumulative_sum', title: 'Cumulative Sum', agg: cumulativeSumMetricAgg },
  { name: 'moving_avg', title: 'Moving Avg', agg: movingAvgMetricAgg, dslName: 'moving_fn' },
  { name: 'serial_diff', title: 'Serial Diff', agg: serialDiffMetricAgg },
];

describe('parent pipeline aggs', function() {
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
          metricAgg = metric.agg;

          const params = settings || {
            metricAgg: '1',
            customMetric: null,
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
              {
                id: '3',
                type: 'max',
                params: { field: '@timestamp' },
                schema: 'metric',
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

      it(`should return a label ${metric.title} of max bytes`, function() {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '1-orderAgg',
            type: 'max',
            params: { field: 'bytes' },
            schema: 'orderAgg',
          },
        });
        expect(metricAgg.makeLabel(aggConfig)).to.eql(`${metric.title} of Max bytes`);
      });

      it(`should return a label prefixed with number of ${metric.title.toLowerCase()}`, function() {
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
        expect(metricAgg.makeLabel(aggConfig)).to.eql(`2. ${metric.title.toLowerCase()} of Count`);
      });

      it('should set parent aggs', function() {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: 'max',
            params: { field: 'bytes' },
            schema: 'orderAgg',
          },
        });
        expect(aggDsl[metric.dslName || metric.name].buckets_path).to.be('2-metric');
        expect(aggDsl.parentAggs['2-metric'].max.field).to.be('bytes');
      });

      it('should set nested parent aggs', function() {
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
                params: { field: 'bytes' },
                schema: 'orderAgg',
              },
            },
            schema: 'orderAgg',
          },
        });
        expect(aggDsl[metric.dslName || metric.name].buckets_path).to.be('2-metric');
        expect(aggDsl.parentAggs['2-metric'][metric.dslName || metric.name].buckets_path).to.be(
          '2-metric-metric'
        );
      });

      it('should have correct formatter', function() {
        init({
          metricAgg: '3',
        });
        expect(metricAgg.getFormat(aggConfig).type.id).to.be('date');
      });

      it('should have correct customMetric nested formatter', function() {
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
                params: { field: 'bytes' },
                schema: 'orderAgg',
              },
            },
            schema: 'orderAgg',
          },
        });
        expect(metricAgg.getFormat(aggConfig).type.id).to.be('bytes');
      });

      it("should call modifyAggConfigOnSearchRequestStart for its customMetric's parameters", () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: 'max',
            params: { field: 'bytes' },
            schema: 'orderAgg',
          },
        });

        const searchSource = {};
        const request = {};
        const customMetricSpy = sinon.spy();
        const customMetric = aggConfig.params.customMetric;

        // Attach a modifyAggConfigOnSearchRequestStart with a spy to the first parameter
        customMetric.type.params[0].modifyAggConfigOnSearchRequestStart = customMetricSpy;

        aggConfig.type.params.forEach(param => {
          param.modifyAggConfigOnSearchRequestStart(aggConfig, searchSource, request);
        });
        expect(customMetricSpy.calledWith(customMetric, searchSource, request)).to.be(true);
      });
    });
  });
});
