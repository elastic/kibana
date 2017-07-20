import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AggTypesBucketsCreateFilterRangeProvider } from 'ui/agg_types/buckets/create_filter/range';

describe('AggConfig Filters', function () {

  describe('range', function () {
    let indexPattern;
    let Vis;
    let createFilter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      createFilter = Private(AggTypesBucketsCreateFilterRangeProvider);
    }));

    it('should return a range filter for range agg', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'range',
            schema: 'segment',
            params: {
              field: 'bytes',
              ranges: [
                { from: 1024, to: 2048 }
              ]
            }
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.range[0];
      const filter = createFilter(aggConfig, { gte: 1024, lt: 2048.0 });
      expect(filter).to.have.property('range');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.range).to.have.property('bytes');
      expect(filter.range.bytes).to.have.property('gte', 1024.0);
      expect(filter.range.bytes).to.have.property('lt', 2048.0);
      expect(filter.meta).to.have.property('formattedValue', '1,024 to 2,048');
    });
  });
});
