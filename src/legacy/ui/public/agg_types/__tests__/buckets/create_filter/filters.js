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
import { createFilterFilters } from '../../../buckets/create_filter/filters';

describe('AggConfig Filters', function() {
  describe('filters', function() {
    let indexPattern;
    let Vis;

    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function(Private) {
        Vis = Private(VisProvider);
        indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      })
    );

    it('should return a filters filter', function() {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'filters',
            schema: 'segment',
            params: {
              filters: [
                { input: { query: 'type:apache', language: 'lucene' } },
                { input: { query: 'type:nginx', language: 'lucene' } },
              ],
            },
          },
        ],
      });

      const aggConfig = vis.aggs.byName('filters')[0];
      const filter = createFilterFilters(aggConfig, 'type:nginx');
      expect(filter.query.bool.must[0].query_string.query).to.be('type:nginx');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.meta).to.have.property('alias', 'type:nginx');
    });
  });
});
