import expect from 'expect.js';
import './agg_type';
import './agg_params';
import './buckets/_histogram';
import './buckets/_geo_hash';
import './buckets/_range';
import './buckets/_terms_other_bucket_helper';
import './buckets/date_histogram/_editor';
import './buckets/date_histogram/_params';
import { aggTypes } from 'ui/agg_types/index';
import { BucketAggType } from 'ui/agg_types/buckets/_bucket_agg_type';
import { MetricAggType } from 'ui/agg_types/metrics/metric_agg_type';

const bucketAggs = aggTypes.byType.buckets;
const metricAggs = aggTypes.byType.metrics;

describe('AggTypesComponent', function () {

  describe('bucket aggs', function () {
    it('all extend BucketAggType', function () {
      bucketAggs.forEach(function (bucketAgg) {
        expect(bucketAgg).to.be.a(BucketAggType);
      });
    });
  });

  describe('metric aggs', function () {
    it('all extend MetricAggType', function () {
      metricAggs.forEach(function (metricAgg) {
        expect(metricAgg).to.be.a(MetricAggType);
      });
    });
  });
});
