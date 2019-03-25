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
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import MockState from 'fixtures/mock_state';
import { FilterBarQueryFilterProvider } from '../query_filter';

describe('get filters', function () {
  const storeNames = {
    app: 'appState',
    global: 'globalState'
  };
  let queryFilter;
  let appState;
  let globalState;

  beforeEach(ngMock.module(
    'kibana',
    'kibana/global_state',
    function ($provide) {
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
    queryFilter = Private(FilterBarQueryFilterProvider);
  }));

  describe('getFilters method', function () {
    let filters;

    beforeEach(function () {
      filters = [
        { query: { match: { extension: { query: 'jpg', type: 'phrase' } } } },
        { query: { match: { '@tags': { query: 'info', type: 'phrase' } } } },
        null
      ];
    });

    it('should return app and global filters', function () {
      appState.filters = [filters[0]];
      globalState.filters = [filters[1]];

      // global filters should be listed first
      let res = queryFilter.getFilters();
      expect(res[0]).to.eql(filters[1]);
      expect(res[1]).to.eql(filters[0]);

      // should return updated version of filters
      const newFilter = { query: { match: { '_type': { query: 'nginx', type: 'phrase' } } } };
      appState.filters.push(newFilter);

      res = queryFilter.getFilters();
      expect(res).to.contain(newFilter);
    });

    it('should append the state store', function () {
      appState.filters = [filters[0]];
      globalState.filters = [filters[1]];

      const res = queryFilter.getFilters();
      expect(res[0].$state.store).to.be(storeNames.global);
      expect(res[1].$state.store).to.be(storeNames.app);
    });

    it('should return non-null filters from specific states', function () {
      const states = [
        [ globalState, queryFilter.getGlobalFilters ],
        [ appState, queryFilter.getAppFilters ],
      ];

      _.each(states, function (state) {
        state[0].filters = filters.slice(0);
        expect(state[0].filters).to.contain(null);

        const res = state[1]();
        expect(res.length).to.be(state[0].filters.length);
        expect(state[0].filters).to.not.contain(null);
      });
    });

    it('should replace the state, not save it', function () {
      const states = [
        [ globalState, queryFilter.getGlobalFilters ],
        [ appState, queryFilter.getAppFilters ],
      ];

      expect(appState.save.called).to.be(false);
      expect(appState.replace.called).to.be(false);


      _.each(states, function (state) {
        expect(state[0].save.called).to.be(false);
        expect(state[0].replace.called).to.be(false);

        state[0].filters = filters.slice(0);
        state[1]();
        expect(state[0].save.called).to.be(false);
        expect(state[0].replace.called).to.be(true);
      });
    });
  });

  describe('filter reconciliation', function () {
    let filters;

    beforeEach(function () {
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
    });

    it('should skip appState filters that match globalState filters', function () {
      globalState.filters = filters;
      const appFilter = _.cloneDeep(filters[1]);
      appState.filters.push(appFilter);

      // global filters should be listed first
      const res = queryFilter.getFilters();
      expect(res).to.have.length(3);
      _.each(res, function (filter) {
        expect(filter.$state.store).to.be('globalState');
      });
    });

    it('should append conflicting appState filters', function () {
      globalState.filters = filters;
      const appFilter = _.cloneDeep(filters[1]);
      appFilter.meta.negate = true;
      appState.filters.push(appFilter);

      // global filters should be listed first
      const res = queryFilter.getFilters();
      expect(res).to.have.length(4);
      expect(res.filter(function (filter) {
        return filter.$state.store === storeNames.global;
      }).length).to.be(3);
      expect(res.filter(function (filter) {
        return filter.$state.store === storeNames.app;
      }).length).to.be(1);
    });

    it('should not affect disabled filters', function () {
      // test adding to globalState
      globalState.filters = _.map(filters, function (filter) {
        const f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      _.each(filters, function (filter) { globalState.filters.push(filter); });
      let res = queryFilter.getFilters();
      expect(res).to.have.length(6);

      // test adding to appState
      globalState.filters = _.map(filters, function (filter) {
        const f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      _.each(filters, function (filter) { appState.filters.push(filter); });
      res = queryFilter.getFilters();
      expect(res).to.have.length(6);
    });
  });
});
