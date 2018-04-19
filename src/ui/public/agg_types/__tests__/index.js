import expect from 'expect.js';
import ngMock from 'ng_mock';
import './agg_type';
import './agg_params';
import './buckets/_histogram';
import './buckets/_geo_hash';
import './buckets/_range';
import './buckets/_terms_other_bucket_helper';
import './buckets/date_histogram/_editor';
import './buckets/date_histogram/_params';
import { AggTypesIndexProvider } from '..';
import { AggTypesBucketsBucketAggTypeProvider } from '../buckets/_bucket_agg_type';
import { AggTypesMetricsMetricAggTypeProvider } from '../metrics/metric_agg_type';

describe('AggTypesComponent', function () {

  describe('bucket aggs', function () {
    let bucketAggs;
    let BucketAggType;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      bucketAggs = Private(AggTypesIndexProvider).byType.buckets;
      BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
    }));

    it('all extend BucketAggType', function () {
      bucketAggs.forEach(function (bucketAgg) {
        expect(bucketAgg).to.be.a(BucketAggType);
      });
    });
  });

  describe('metric aggs', function () {
    let metricAggs;
    let MetricAggType;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      metricAggs = Private(AggTypesIndexProvider).byType.metrics;
      MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
    }));

    it('all extend MetricAggType', function () {
      metricAggs.forEach(function (metricAgg) {
        expect(metricAgg).to.be.a(MetricAggType);
      });
    });
  });
});
