
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import VisProvider from 'ui/vis';
import VisAggConfigProvider from 'ui/vis/agg_config';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import AggTypesBucketsCreateFilterHistogramProvider from 'ui/agg_types/buckets/create_filter/histogram';

describe('AggConfig Filters', function () {
  describe('histogram', function () {
    let AggConfig;
    let indexPattern;
    let Vis;
    let createFilter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      AggConfig = Private(VisAggConfigProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      createFilter = Private(AggTypesBucketsCreateFilterHistogramProvider);
    }));

    it('should return an range filter for histogram', function () {
      let vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'histogram',
            schema: 'segment',
            params: { field: 'bytes', interval: 1024 }
          }
        ]
      });

      let aggConfig = vis.aggs.byTypeName.histogram[0];
      let filter = createFilter(aggConfig, 2048);
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter).to.have.property('range');
      expect(filter.range).to.have.property('bytes');
      expect(filter.range.bytes).to.have.property('gte', 2048);
      expect(filter.range.bytes).to.have.property('lt', 3072);
      expect(filter.meta).to.have.property('formattedValue', '2,048');
    });
  });
});
