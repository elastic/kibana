var expect = require('expect.js');
var ngMock = require('ngMock');

describe('AggTypesComponent', function () {
  require('./AggType');
  require('./AggParams');
  require('./bucketCountBetween');
  require('./buckets/_histogram');

  describe('bucket aggs', function () {
    var bucketAggs;
    var BucketAggType;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
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

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      metricAggs = Private(require('ui/agg_types/index')).byType.metrics;
      MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    }));

    it('all extend MetricAggType', function () {
      metricAggs.forEach(function (metricAgg) {
        expect(metricAgg).to.be.a(MetricAggType);
      });
    });
  });
});
