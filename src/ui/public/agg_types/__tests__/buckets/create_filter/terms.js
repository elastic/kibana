import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from '../../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AggTypesBucketsCreateFilterTermsProvider } from '../../../buckets/create_filter/terms';

describe('AggConfig Filters', function () {

  describe('terms', function () {
    let indexPattern;
    let Vis;
    let createFilter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      createFilter = Private(AggTypesBucketsCreateFilterTermsProvider);
    }));

    it('should return a match filter for terms', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'terms', schema: 'segment', params: { field: '_type' } } ]
      });
      const aggConfig = vis.aggs.byTypeName.terms[0];
      const filter = createFilter(aggConfig, 'apache');
      expect(filter).to.have.property('query');
      expect(filter.query).to.have.property('match');
      expect(filter.query.match).to.have.property('_type');
      expect(filter.query.match._type).to.have.property('query', 'apache');
      expect(filter.query.match._type).to.have.property('type', 'phrase');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);

    });

    it('should set query to true or false for boolean filter', () => {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'terms', schema: 'segment', params: { field: 'ssl' } } ]
      });
      const aggConfig = vis.aggs.byTypeName.terms[0];
      const filterFalse = createFilter(aggConfig, 0);
      expect(filterFalse).to.have.property('query');
      expect(filterFalse.query).to.have.property('match');
      expect(filterFalse.query.match).to.have.property('ssl');
      expect(filterFalse.query.match.ssl).to.have.property('query', false);

      const filterTrue = createFilter(aggConfig, 1);
      expect(filterTrue).to.have.property('query');
      expect(filterTrue.query).to.have.property('match');
      expect(filterTrue.query.match).to.have.property('ssl');
      expect(filterTrue.query.match.ssl).to.have.property('query', true);
    });
  });
});
