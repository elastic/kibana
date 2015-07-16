define(function (require) {
  var expect = require('expect.js');

  describe('AggTypesComponent', function () {
    describe(require('specs/components/agg_types/_agg_type'));
    describe(require('specs/components/agg_types/_agg_params'));
    describe(require('specs/components/agg_types/_bucket_count_between'));
    describe(require('specs/components/agg_types/buckets/_histogram'));

    describe('bucket aggs', function () {
      var bucketAggs;
      var BucketAggType;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        bucketAggs = Private(require('ui/agg_types/index')).byType.buckets;
        BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
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

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        metricAggs = Private(require('ui/agg_types/index')).byType.metrics;
        MetricAggType = Private(require('ui/agg_types/metrics/_metric_agg_type'));
      }));

      it('all extend MetricAggType', function () {
        metricAggs.forEach(function (metricAgg) {
          expect(metricAgg).to.be.a(MetricAggType);
        });
      });
    });
  });
});
