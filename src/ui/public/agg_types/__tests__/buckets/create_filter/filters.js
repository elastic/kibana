import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from '../../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { createFilterFilters } from '../../../buckets/create_filter/filters';

describe('AggConfig Filters', function () {
  describe('filters', function () {
    let indexPattern;
    let Vis;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    }));

    it('should return a filters filter', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'filters',
            schema: 'segment',
            params: {
              filters: [
                { input: { query: { query_string: { query: 'type:apache' } } } },
                { input: { query: { query_string: { query: 'type:nginx' } } } }
              ]
            }
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.filters[0];
      const filter = createFilterFilters(aggConfig, 'type:nginx');
      expect(filter.query.query_string.query).to.be('type:nginx');
      expect(filter.meta).to.have.property('index', indexPattern.id);

    });
  });
});
