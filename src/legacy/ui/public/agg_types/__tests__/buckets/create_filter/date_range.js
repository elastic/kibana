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
import moment from 'moment';
import { VisProvider } from '../../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { createFilterDateRange } from '../../../buckets/create_filter/date_range';

describe('AggConfig Filters', function () {
  describe('Date range', function () {
    let indexPattern;
    let Vis;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
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
      const filter = createFilterDateRange(aggConfig, 'February 1st, 2015 to February 7th, 2015');
      expect(filter).to.have.property('range');
      expect(filter).to.have.property('meta');
      expect(filter.meta).to.have.property('index', indexPattern.id);
      expect(filter.range).to.have.property('@timestamp');
      expect(filter.range['@timestamp']).to.have.property('gte', moment(new Date('1 Feb 2015')).toISOString());
      expect(filter.range['@timestamp']).to.have.property('lt', moment(new Date('7 Feb 2015')).toISOString());
    });
  });
});
