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
import { FilterBarLibMapFilterProvider } from '../map_filter';

describe('Filter Bar Directive', function () {
  let mapFilter;
  let $rootScope;


  beforeEach(ngMock.module(
    'kibana',
    'kibana/courier',
    function ($provide) {
      $provide.service('indexPatterns', require('fixtures/mock_index_patterns'));
    }
  ));

  beforeEach(ngMock.inject(function (_$rootScope_, Private) {
    mapFilter = Private(FilterBarLibMapFilterProvider);
    $rootScope = _$rootScope_;
  }));

  describe('mapFilter()', function () {
    it('should map query filters', function (done) {
      const before = { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } };
      mapFilter(before).then(function (after) {
        expect(after).to.have.property('meta');
        expect(after.meta).to.have.property('key', '_type');
        expect(after.meta).to.have.property('value', 'apache');
        expect(after.meta).to.have.property('disabled', false);
        expect(after.meta).to.have.property('negate', false);
        done();
      });
      $rootScope.$apply();
    });

    it('should map exists filters', function (done) {
      const before = { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } };
      mapFilter(before).then(function (after) {
        expect(after).to.have.property('meta');
        expect(after.meta).to.have.property('key', '@timestamp');
        expect(after.meta).to.have.property('value', 'exists');
        expect(after.meta).to.have.property('disabled', false);
        expect(after.meta).to.have.property('negate', false);
        done();
      });
      $rootScope.$apply();
    });

    it('should map missing filters', function (done) {
      const before = { meta: { index: 'logstash-*' }, missing: { field: '@timestamp' } };
      mapFilter(before).then(function (after) {
        expect(after).to.have.property('meta');
        expect(after.meta).to.have.property('key', '@timestamp');
        expect(after.meta).to.have.property('value', 'missing');
        expect(after.meta).to.have.property('disabled', false);
        expect(after.meta).to.have.property('negate', false);
        done();
      });
      $rootScope.$apply();
    });

    it('should map json filter', function (done) {
      const before = { meta: { index: 'logstash-*' }, query: { match_all: {} } };
      mapFilter(before).then(function (after) {
        expect(after).to.have.property('meta');
        expect(after.meta).to.have.property('key', 'query');
        expect(after.meta).to.have.property('value', '{"match_all":{}}');
        expect(after.meta).to.have.property('disabled', false);
        expect(after.meta).to.have.property('negate', false);
        done();
      });
      $rootScope.$apply();
    });

    it('should finish with a catch', function (done) {
      const before = { meta: { index: 'logstash-*' } };
      mapFilter(before).catch(function (error) {
        expect(error).to.be.an(Error);
        expect(error.message).to.be('No mappings have been found for filter.');
        done();
      });
      $rootScope.$apply();
    });

  });

});
