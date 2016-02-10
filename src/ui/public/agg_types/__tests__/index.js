import expect from 'expect.js';
import ngMock from 'ngMock';
import './AggType';
import './AggParams';
import './bucketCountBetween';
import './buckets/_histogram';
import './buckets/_range';
import AggTypesIndexProvider from 'ui/agg_types/index';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/MetricAggType';

describe('AggTypesComponent', function () {

  describe('bucket aggs', function () {
    var bucketAggs;
    var BucketAggType;

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
    var metricAggs;
    var MetricAggType;

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
