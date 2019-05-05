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

import _ from 'lodash';
import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import MockState from 'fixtures/mock_state';
import { FilterBarQueryFilterProvider } from '../query_filter';

describe('invert filters', function () {
  let filters;
  let queryFilter;
  let $rootScope;
  let appState;
  let globalState;

  beforeEach(ngMock.module(
    'kibana',
    'kibana/courier',
    'kibana/global_state',
    function ($provide) {
      $provide.service('indexPatterns', require('fixtures/mock_index_patterns'));

      appState = new MockState({ filters: [] });
      $provide.service('getAppState', function () {
        return function () { return appState; };
      });

      globalState = new MockState({ filters: [] });
      $provide.service('globalState', function () {
        return globalState;
      });
    }
  ));

  beforeEach(ngMock.inject(function (_$rootScope_, Private) {
    $rootScope = _$rootScope_;
    queryFilter = Private(FilterBarQueryFilterProvider);

    filters = [
      {
        query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { '_type': { query: 'nginx', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      }
    ];
  }));

  describe('inverting a filter', function () {
    it('should swap the negate property in appState', function () {
      _.each(filters, function (filter) {
        expect(filter.meta.negate).to.be(false);
        appState.filters.push(filter);
      });

      queryFilter.invertFilter(filters[1]);
      expect(appState.filters[1].meta.negate).to.be(true);
    });

    it('should toggle the negate property in globalState', function () {
      _.each(filters, function (filter) {
        expect(filter.meta.negate).to.be(false);
        globalState.filters.push(filter);
      });

      queryFilter.invertFilter(filters[1]);
      expect(globalState.filters[1].meta.negate).to.be(true);
    });

    it('should fire the update and fetch events', function () {
      const updateStub = sinon.stub();
      const fetchStub = sinon.stub();

      queryFilter.getUpdates$().subscribe({
        next: updateStub,
      });

      queryFilter.getFetches$().subscribe({
        next: fetchStub,
      });
      appState.filters = filters;

      // set up the watchers
      $rootScope.$digest();
      queryFilter.invertFilter(filters[1]);
      // trigger the digest loop to fire the watchers
      $rootScope.$digest();

      expect(fetchStub.called);
      expect(updateStub.called);
    });
  });

  describe('bulk inverting', function () {
    beforeEach(function () {
      appState.filters = filters;
      globalState.filters = _.map(_.cloneDeep(filters), function (filter) {
        filter.meta.negate = true;
        return filter;
      });
    });

    it('should swap the negate state for all filters', function () {
      queryFilter.invertAll();
      _.each(appState.filters, function (filter) {
        expect(filter.meta.negate).to.be(true);
      });
      _.each(globalState.filters, function (filter) {
        expect(filter.meta.negate).to.be(false);
      });
    });

    it('should work without global state filters', function () {
      // remove global filters
      delete globalState.filters;

      queryFilter.invertAll();
      _.each(appState.filters, function (filter) {
        expect(filter.meta.negate).to.be(true);
      });
    });
  });
});
