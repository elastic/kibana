
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import VisProvider from 'ui/vis';
import VisAggConfigProvider from 'ui/vis/agg_config';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import AggTypesBucketsCreateFilterFiltersProvider from 'ui/agg_types/buckets/create_filter/filters';

describe('AggConfig Filters', function () {
  describe('filters', function () {
    let AggConfig;
    let indexPattern;
    let Vis;
    let createFilter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      AggConfig = Private(VisAggConfigProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      createFilter = Private(AggTypesBucketsCreateFilterFiltersProvider);
    }));

    it('should return a filters filter', function () {
      let vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'filters',
            schema: 'segment',
            params: {
              filters: [
                { input: { query: { query_string: { query: '_type:apache' } } } },
                { input: { query: { query_string: { query: '_type:nginx' } } } }
              ]
            }
          }
        ]
      });

      let aggConfig = vis.aggs.byTypeName.filters[0];
      let filter = createFilter(aggConfig, '_type:nginx');
      expect(_.omit(filter, 'meta')).to.eql(aggConfig.params.filters[1].input);
      expect(filter.meta).to.have.property('index', indexPattern.id);

    });

  });
});
