import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import DerivativeProvider from 'ui/agg_types/metrics/derivative';
import VisProvider from 'ui/vis';
import StubbedIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

describe('Derivative metric', function () {
  let aggDsl;
  let derivativeMetric;
  let aggConfig;

  function init(settings) {
    ngMock.module('kibana');
    ngMock.inject(function (Private) {
      const Vis = Private(VisProvider);
      const indexPattern = Private(StubbedIndexPattern);
      derivativeMetric = Private(DerivativeProvider);

      const params = settings || {
        buckets_path: '1',
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
            type: 'derivative',
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

  it('should return a label prefixed with Derivative of', function () {
    init();
    expect(derivativeMetric.makeLabel(aggConfig)).to.eql('Derivative of Count');
  });

  it('should return a label Derivative of max bytes', function () {
    init({
      buckets_path: 'custom',
      customMetric: {
        id:'1-orderAgg',
        type: 'max',
        params: { field: 'bytes' },
        schema: 'orderAgg'
      }
    });
    expect(derivativeMetric.makeLabel(aggConfig)).to.eql('Derivative of Max bytes');
  });

  it('should return a label prefixed with number of derivative', function () {
    init({
      buckets_path: 'custom',
      customMetric: {
        id:'2-orderAgg',
        type: 'derivative',
        params: {
          buckets_path: 'custom',
          customMetric: {
            id:'2-orderAgg-orderAgg',
            type: 'count',
            schema: 'orderAgg'
          }
        },
        schema: 'orderAgg'
      }
    });
    expect(derivativeMetric.makeLabel(aggConfig)).to.eql('2. derivative of Count');
  });

  it('should set parent aggs', function () {
    init({
      buckets_path: 'custom',
      customMetric: {
        id:'2-orderAgg',
        type: 'max',
        params: { field: 'bytes' },
        schema: 'orderAgg'
      }
    });
    expect(aggDsl.parentAggs['2-orderAgg'].max.field).to.be('bytes');
  });

  it('should set nested parent aggs', function () {
    init({
      buckets_path: 'custom',
      customMetric: {
        id:'2-orderAgg',
        type: 'derivative',
        params: {
          buckets_path: 'custom',
          customMetric: {
            id:'2-orderAgg-orderAgg',
            type: 'max',
            params: { field: 'bytes' },
            schema: 'orderAgg'
          }
        },
        schema: 'orderAgg'
      }
    });
    expect(aggDsl.parentAggs['2-orderAgg'].derivative.buckets_path).to.be('2-orderAgg-orderAgg');
  });

});
