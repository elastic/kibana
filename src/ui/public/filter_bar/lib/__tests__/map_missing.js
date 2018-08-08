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

import ngMock from 'ng_mock';
import expect from 'expect.js';
import { FilterBarLibMapMissingProvider } from '../map_missing';

describe('Filter Bar Directive', function () {
  describe('mapMissing()', function () {

    let mapMissing;

    let $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapMissing = Private(FilterBarLibMapMissingProvider);
    }));

    it('should return the key and value for matching filters', function (done) {
      const filter = { missing: { field: '_type' } };
      mapMissing(filter).then(function (result) {
        expect(result).to.have.property('key', '_type');
        expect(result).to.have.property('value', 'missing');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      const filter = { query: { match: { query: 'foo' } } };
      mapMissing(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
