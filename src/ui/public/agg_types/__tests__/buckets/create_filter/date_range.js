
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AggTypesBucketsCreateFilterDateRangeProvider } from 'ui/agg_types/buckets/create_filter/date_range';

describe('AggConfig Filters', function () {
  describe('Date range', function () {
    let indexPattern;
    let Vis;
    let createFilter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      createFilter = Private(AggTypesBucketsCreateFilterDateRangeProvider);
    }));

    it('should return a range filter for date_range agg', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'date_range',
            params: {
              field: '@timestamp',
              ranges: [
                { from: '2014-01-01', to: '2014-12-31' }
              ]
            }
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.date_range[0];
      const filter = createFilter(aggConfig, 'February 1st, 2015 to February 7th, 2015');
      expect(filter).to.have.property('range');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.range).to.have.property('@timestamp');
      expect(filter.range['@timestamp']).to.have.property('gte', +new Date('1 Feb 2015'));
      expect(filter.range['@timestamp']).to.have.property('lt', +new Date('7 Feb 2015'));
    });
  });
});
