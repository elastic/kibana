import expect from 'expect.js';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { AggTypesMetricsDerivativeProvider } from '../../metrics/derivative';
import { AggTypesMetricsCumulativeSumProvider } from '../../metrics/cumulative_sum';
import { AggTypesMetricsMovingAvgProvider } from '../../metrics/moving_avg';
import { AggTypesMetricsSerialDiffProvider } from '../../metrics/serial_diff';
import { VisProvider } from '../../../vis';
import StubbedIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

const metrics = [
  { name: 'derivative', title: 'Derivative', provider: AggTypesMetricsDerivativeProvider },
  { name: 'cumulative_sum', title: 'Cumulative Sum', provider: AggTypesMetricsCumulativeSumProvider },
  { name: 'moving_avg', title: 'Moving Avg', provider: AggTypesMetricsMovingAvgProvider },
  { name: 'serial_diff', title: 'Serial Diff', provider: AggTypesMetricsSerialDiffProvider },
];

describe('parent pipeline aggs', function () {
  metrics.forEach(metric => {
    describe(`${metric.title} metric`, function () {

      let aggDsl;
      let metricAgg;
      let aggConfig;

      function init(settings) {
        ngMock.module('kibana');
        ngMock.inject(function (Private) {
          const Vis = Private(VisProvider);
          const indexPattern = Private(StubbedIndexPattern);
          indexPattern.stubSetFieldFormat('bytes', 'bytes');
          metricAgg = Private(metric.provider);

          const params = settings || {
            metricAgg: '1',
            customMetric: null
          };

          const vis = new Vis(indexPattern, {
            title: 'New Visualization',
            type: 'metric',
            params: {
              fontSize: 60,
              handleNoResults: true
            },
            aggs: [
              {
                id: '1',
                type: 'count',
                schema: 'metric'
              },
              {
                id: '2',
                type: metric.name,
                schema: 'metric',
                params
              },
              {
                id: '3',
                type: 'max',
                params: { field: '@timestamp' },
                schema: 'metric'
              }
            ],
            listeners: {}
          });

          // Grab the aggConfig off the vis (we don't actually use the vis for anything else)
          aggConfig = vis.aggs[1];
          aggDsl = aggConfig.toDsl();
        });
      }

      it(`should return a label prefixed with ${metric.title} of`, function () {
        init();
        expect(metricAgg.makeLabel(aggConfig)).to.eql(`${metric.title} of Count`);
      });

      it(`should return a label ${metric.title} of max bytes`, function () {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '1-orderAgg',
            type: 'max',
            params: { field: 'bytes' },
            schema: 'orderAgg'
          }
        });
        expect(metricAgg.makeLabel(aggConfig)).to.eql(`${metric.title} of Max bytes`);
      });

      it(`should return a label prefixed with number of ${metric.title.toLowerCase()}`, function () {
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
                schema: 'orderAgg'
              }
            },
            schema: 'orderAgg'
          }
        });
        expect(metricAgg.makeLabel(aggConfig)).to.eql(`2. ${metric.title.toLowerCase()} of Count`);
      });

      it('should set parent aggs', function () {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: 'max',
            params: { field: 'bytes' },
            schema: 'orderAgg'
          }
        });
        expect(aggDsl[metric.name].buckets_path).to.be('2-metric');
        expect(aggDsl.parentAggs['2-metric'].max.field).to.be('bytes');
      });

      it('should set nested parent aggs', function () {
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
                schema: 'orderAgg'
              }
            },
            schema: 'orderAgg'
          }
        });
        expect(aggDsl[metric.name].buckets_path).to.be('2-metric');
        expect(aggDsl.parentAggs['2-metric'][metric.name].buckets_path).to.be('2-metric-metric');
      });

      it('should have correct formatter', function () {
        init({
          metricAgg: '3'
        });
        expect(metricAgg.getFormat(aggConfig).type.id).to.be('date');
      });

      it('should have correct customMetric nested formatter', function () {
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
                schema: 'orderAgg'
              }
            },
            schema: 'orderAgg'
          }
        });
        expect(metricAgg.getFormat(aggConfig).type.id).to.be('bytes');
      });

      it('should call modifyAggConfigOnSearchRequestStart for its customMetric\'s parameters', () => {
        init({
          metricAgg: 'custom',
          customMetric: {
            id: '2-metric',
            type: 'max',
            params: { field: 'bytes' },
            schema: 'orderAgg'
          }
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
