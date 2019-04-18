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
import { FilterBarPushFilterProvider } from '../push_filter';
describe('Filter Bar pushFilter()', function () {

  let pushFilterFn;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    pushFilterFn = Private(FilterBarPushFilterProvider);
  }));

  it('is a function that returns a function', function () {
    expect(pushFilterFn).to.be.a(Function);
    expect(pushFilterFn({})).to.be.a(Function);
  });

  it('throws an error if passed something besides an object', function () {
    expect(pushFilterFn).withArgs(true).to.throwError();
  });

  describe('pushFilter($state)()', function () {
    let $state;
    let pushFilter;
    let filter;

    beforeEach(ngMock.inject(function () {
      $state = { $newFilters: [] };
      pushFilter = pushFilterFn($state);
      filter = { query: { query_string: { query: '' } } };
    }));

    it('should create the filters property it needed', function () {
      const altState = {};
      pushFilterFn(altState)(filter);
      expect(altState.$newFilters).to.be.an(Array);
    });

    it('should replace the filters property instead of modifying it', function () {
      // If we push directly instead of using pushFilter a $watch('filters') does not trigger

      let oldFilters;

      oldFilters = $state.$newFilters;
      $state.$newFilters.push(filter);
      expect($state.$newFilters).to.equal(oldFilters); // Same object

      oldFilters = $state.$newFilters;
      pushFilter(filter);
      expect($state.$newFilters).to.not.equal(oldFilters); // New object!
    });

    it('should add meta data to the filter', function () {
      pushFilter(filter, true, 'myIndex');
      expect($state.$newFilters[0].meta).to.be.an(Object);

      expect($state.$newFilters[0].meta.negate).to.be(true);
      expect($state.$newFilters[0].meta.index).to.be('myIndex');

      pushFilter(filter, false, 'myIndex');
      expect($state.$newFilters[0].meta.negate).to.be(false);
    });



  });

});
