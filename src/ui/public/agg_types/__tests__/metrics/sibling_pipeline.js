import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggTypesMetricsBucketSumProvider } from 'ui/agg_types/metrics/bucket_sum';
import { AggTypesMetricsBucketAvgProvider } from 'ui/agg_types/metrics/bucket_avg';
import { AggTypesMetricsBucketMinProvider } from 'ui/agg_types/metrics/bucket_min';
import { AggTypesMetricsBucketMaxProvider } from 'ui/agg_types/metrics/bucket_max';
import { VisProvider } from 'ui/vis';
import StubbedIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

const metrics = [
  { name: 'sum_bucket', title: 'Overall Sum', provider: AggTypesMetricsBucketSumProvider },
  { name: 'avg_bucket', title: 'Overall Average', provider: AggTypesMetricsBucketAvgProvider },
  { name: 'min_bucket', title: 'Overall Min', provider: AggTypesMetricsBucketMinProvider },
  { name: 'max_bucket', title: 'Overall Max', provider: AggTypesMetricsBucketMaxProvider },
];

describe('sibling pipeline aggs', function () {
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
          metricAgg = Private(metric.provider);

          const params = settings || {
            customMetric: {
              id: '5',
              type: 'count',
              schema: 'metric'
            },
            customBucket: {
              id: '6',
              type: 'date_histogram',
              schema: 'bucket',
              params: { field: '@timestamp' }
            }
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

      it('should set parent aggs', function () {
        init();
        expect(aggDsl[metric.name].buckets_path).to.be('2-bucket>_count');
        expect(aggDsl.parentAggs['2-bucket'].date_histogram).to.not.be.undefined;
      });

      it('should set nested parent aggs', function () {
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
            params: { field: '@timestamp' },
          }
        });
        expect(aggDsl[metric.name].buckets_path).to.be('2-bucket>2-metric');
        expect(aggDsl.parentAggs['2-bucket'].date_histogram).to.not.be.undefined;
        expect(aggDsl.parentAggs['2-bucket'].aggs['2-metric'].avg.field).to.equal('bytes');
      });

    });
  });

});
