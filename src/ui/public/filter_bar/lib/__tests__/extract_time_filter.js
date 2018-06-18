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

import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibExtractTimeFilterProvider } from '../extract_time_filter';

describe('Filter Bar Directive', function () {
  describe('extractTimeFilter()', function () {
    let extractTimeFilter;
    let $rootScope;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier',
      function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      }
    ));

    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      extractTimeFilter = Private(FilterBarLibExtractTimeFilterProvider);
      $rootScope = _$rootScope_;
    }));

    it('should return the matching filter for the defualt time field', function (done) {
      const filters = [
        { meta: { index: 'logstash-*' }, query: { match: { _type: { query: 'apache', type: 'phrase' } } } },
        { meta: { index: 'logstash-*' }, range: { 'time': { gt: 1388559600000, lt: 1388646000000 } } }
      ];
      extractTimeFilter(filters).then(function (filter) {
        expect(filter).to.eql(filters[1]);
        done();
      });
      $rootScope.$apply();
    });

    it('should not return the non-matching filter for the defualt time field', function (done) {
      const filters = [
        { meta: { index: 'logstash-*' }, query: { match: { _type: { query: 'apache', type: 'phrase' } } } },
        { meta: { index: 'logstash-*' }, range: { '@timestamp': { gt: 1388559600000, lt: 1388646000000 } } }
      ];
      extractTimeFilter(filters).then(function (filter) {
        expect(filter).to.be(undefined);
        done();
      });
      $rootScope.$apply();
    });

  });
});
