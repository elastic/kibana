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

describe('add filters', function () {
  require('test_utils/no_digest_promises').activateForSuite();

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
  }));

  beforeEach(function () {
    filters = [
      {
        query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
        meta: { index: 'logstash-*', negate: false, disabled: false }
      },
      {
        query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
        meta: { index: 'logstash-*', negate: false, disabled: false }
      },
      {
        query: { match: { '_type': { query: 'nginx', type: 'phrase' } } },
        meta: { index: 'logstash-*', negate: false, disabled: false }
      }
    ];
  });

  describe('adding filters', function () {
    it('should add filters to appState', async function () {
      await queryFilter.addFilters(filters);
      expect(appState.filters.length).to.be(3);
      expect(globalState.filters.length).to.be(0);
    });

    it('should add filters to globalState', async function () {
      await queryFilter.addFilters(filters, true);

      expect(appState.filters.length).to.be(0);
      expect(globalState.filters.length).to.be(3);
    });

    it('should accept a single filter', async function () {
      await queryFilter.addFilters(filters[0]);

      expect(appState.filters.length).to.be(1);
      expect(globalState.filters.length).to.be(0);
    });

    it('should allow overwriting a positive filter by a negated one', async function () {

      // Add negate: false version of the filter
      const filter = _.cloneDeep(filters[0]);
      filter.meta.negate = false;

      await queryFilter.addFilters(filter);
      $rootScope.$digest();
      expect(appState.filters.length).to.be(1);
      expect(appState.filters[0]).to.eql(filter);

      // Add negate: true version of the same filter
      const negatedFilter = _.cloneDeep(filters[0]);
      negatedFilter.meta.negate = true;

      await queryFilter.addFilters(negatedFilter);
      $rootScope.$digest();
      // The negated filter should overwrite the positive one
      expect(appState.filters.length).to.be(1);
      expect(appState.filters[0]).to.eql(negatedFilter);
    });

    it('should allow overwriting a negated filter by a positive one', async function () {
      // Add negate: true version of the same filter
      const negatedFilter = _.cloneDeep(filters[0]);
      negatedFilter.meta.negate = true;

      await queryFilter.addFilters(negatedFilter);
      $rootScope.$digest();

      // The negated filter should overwrite the positive one
      expect(appState.filters.length).to.be(1);
      expect(appState.filters[0]).to.eql(negatedFilter);

      // Add negate: false version of the filter
      const filter = _.cloneDeep(filters[0]);
      filter.meta.negate = false;

      await queryFilter.addFilters(filter);
      $rootScope.$digest();
      expect(appState.filters.length).to.be(1);
      expect(appState.filters[0]).to.eql(filter);
    });

    it('should fire the update and fetch events', async function () {
      const emitSpy = sinon.spy(queryFilter, 'emit');

      const awaitFetch = new Promise(resolve => {
        queryFilter.on('fetch', () => {
          resolve();
        });
      });

      // set up the watchers, add new filters, and crank the digest loop
      $rootScope.$digest();
      await queryFilter.addFilters(filters);
      $rootScope.$digest();

      // updates should trigger state saves
      expect(appState.save.callCount).to.be(1);
      expect(globalState.save.callCount).to.be(1);

      // this time, events should be emitted
      await awaitFetch;
      expect(emitSpy.callCount).to.be(2);
      expect(emitSpy.firstCall.args[0]).to.be('update');
      expect(emitSpy.secondCall.args[0]).to.be('fetch');
    });
  });

  describe('filter reconciliation', function () {
    it('should de-dupe appState filters being added', async function () {
      const newFilter = _.cloneDeep(filters[1]);
      appState.filters = filters;
      $rootScope.$digest();
      expect(appState.filters.length).to.be(3);

      await queryFilter.addFilters(newFilter);
      $rootScope.$digest();
      expect(appState.filters.length).to.be(3);
    });

    it('should de-dupe globalState filters being added', async function () {
      const newFilter = _.cloneDeep(filters[1]);
      globalState.filters = filters;
      $rootScope.$digest();
      expect(globalState.filters.length).to.be(3);

      await queryFilter.addFilters(newFilter, true);
      $rootScope.$digest();
      expect(globalState.filters.length).to.be(3);
    });

    it('should mutate global filters on appState filter changes', async function () {
      const idx = 1;
      globalState.filters = filters;
      $rootScope.$digest();

      const appFilter = _.cloneDeep(filters[idx]);
      appFilter.meta.negate = true;
      await queryFilter.addFilters(appFilter);
      $rootScope.$digest();

      const res = queryFilter.getFilters();
      expect(res).to.have.length(3);
      _.each(res, function (filter, i) {
        expect(filter.$state.store).to.be('globalState');
        // make sure global filter actually mutated
        expect(filter.meta.negate).to.be(i === idx);
      });
    });
  });
});
