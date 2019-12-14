/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { VisProvider } from '../../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { createFilterTerms } from '../../../buckets/create_filter/terms';

describe('AggConfig Filters', function() {
  describe('terms', function() {
    let indexPattern;
    let Vis;

    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function(Private) {
        Vis = Private(VisProvider);
        indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      })
    );

    it('should return a match filter for terms', function() {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [{ type: 'terms', schema: 'segment', params: { field: '_type' } }],
      });
      const aggConfig = vis.aggs.byName('terms')[0];
      const filter = createFilterTerms(aggConfig, 'apache');
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
        aggs: [{ type: 'terms', schema: 'segment', params: { field: 'ssl' } }],
      });
      const aggConfig = vis.aggs.byName('terms')[0];
      const filterFalse = createFilterTerms(aggConfig, 0);
      expect(filterFalse).to.have.property('query');
      expect(filterFalse.query).to.have.property('match');
      expect(filterFalse.query.match).to.have.property('ssl');
      expect(filterFalse.query.match.ssl).to.have.property('query', false);

      const filterTrue = createFilterTerms(aggConfig, 1);
      expect(filterTrue).to.have.property('query');
      expect(filterTrue.query).to.have.property('match');
      expect(filterTrue.query.match).to.have.property('ssl');
      expect(filterTrue.query.match.ssl).to.have.property('query', true);
    });

    it('should generate correct __missing__ filter', () => {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [{ type: 'terms', schema: 'segment', params: { field: '_type' } }],
      });
      const aggConfig = vis.aggs.byName('terms')[0];
      const filter = createFilterTerms(aggConfig, '__missing__');
      expect(filter).to.have.property('exists');
      expect(filter.exists).to.have.property('field', '_type');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.meta).to.have.property('negate', true);
    });

    it('should generate correct __other__ filter', () => {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [{ type: 'terms', schema: 'segment', params: { field: '_type' } }],
      });
      const aggConfig = vis.aggs.byName('terms')[0];
      const filter = createFilterTerms(aggConfig, '__other__', { terms: ['apache'] })[0];
      expect(filter).to.have.property('query');
      expect(filter.query).to.have.property('bool');
      expect(filter.query.bool).to.have.property('should');
      expect(filter.query.bool.should[0]).to.have.property('match_phrase');
      expect(filter.query.bool.should[0].match_phrase).to.have.property('_type', 'apache');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.meta).to.have.property('negate', true);
    });
  });
});
