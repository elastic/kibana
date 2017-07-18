import expect from 'expect.js';
import ngMock from 'ng_mock';
import './agg_type';
import './agg_params';
import './buckets/_histogram';
import './buckets/_geo_hash';
import './buckets/_range';
import { AggTypesIndexProvider } from 'ui/agg_types/index';
import { AggTypesBucketsBucketAggTypeProvider } from 'ui/agg_types/buckets/_bucket_agg_type';
import { AggTypesMetricsMetricAggTypeProvider } from 'ui/agg_types/metrics/metric_agg_type';

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
