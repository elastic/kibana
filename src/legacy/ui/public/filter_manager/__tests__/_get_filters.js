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
import { getFiltersArray } from './_get_filters_array';
import { FilterStateStore } from '@kbn/es-query';


describe('get filters', function () {
  let queryFilter;
  let appState;
  let globalState;

  beforeEach(ngMock.module(
    'kibana',
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
    queryFilter = Private(FilterBarQueryFilterProvider);
  }));

  describe('getFilters method', function () {
    let filters;

    beforeEach(function () {
      filters = getFiltersArray();
    });

    it('should return app and global filters', async function () {
      await queryFilter.addFilters(filters[0], false);
      await queryFilter.addFilters(filters[1], true);

      // global filters should be listed first
      let res = queryFilter.getFilters();
      expect(res[0].$state.store).to.eql(FilterStateStore.GLOBAL_STATE);
      expect(res[0].meta.disabled).to.eql(filters[1].meta.disabled);
      expect(res[0].query).to.eql(filters[1].query);

      expect(res[1].$state.store).to.eql(FilterStateStore.APP_STATE);
      expect(res[1].meta.disabled).to.eql(filters[0].meta.disabled);
      expect(res[1].query).to.eql(filters[0].query);

      // should return updated version of filters
      await queryFilter.addFilters(filters[2], false);

      res = queryFilter.getFilters();
      expect(res).to.have.length(3);
    });

    it('should replace the state, not save it', function () {
      const states = [
        [ globalState, queryFilter.getGlobalFilters ],
        [ appState, queryFilter.getAppFilters ],
      ];

      expect(appState.save.called).to.be(false);
      expect(appState.replace.called).to.be(false);


      _.each(states, async function (state, index) {
        expect(state[0].save.called).to.be(false);
        expect(state[0].replace.called).to.be(false);

        await queryFilter.addFilters(filters.slice(0), index === 0);

        state[1]();
        expect(state[0].save.called).to.be(false);
        expect(state[0].replace.called).to.be(true);
      });
    });
  });

  describe('filter reconciliation', function () {
    let filters;

    beforeEach(function () {
      filters = getFiltersArray();
    });

    it('should skip appState filters that match globalState filters', async function () {
      await queryFilter.addFilters(filters, true);
      const appFilter = _.cloneDeep(filters[1]);
      await queryFilter.addFilters(appFilter, false);

      // global filters should be listed first
      const res = queryFilter.getFilters();
      expect(res).to.have.length(3);
      _.each(res, function (filter) {
        expect(filter.$state.store).to.be(FilterStateStore.GLOBAL_STATE);
      });
    });

    it('should append conflicting appState filters', async function () {
      await queryFilter.addFilters(filters, true);
      const appFilter = _.cloneDeep(filters[1]);
      appFilter.meta.negate = true;
      appFilter.$state.store = FilterStateStore.APP_STATE;
      await queryFilter.addFilters(appFilter, false);

      // global filters should be listed first
      const res = queryFilter.getFilters();
      expect(res).to.have.length(4);
      expect(res.filter(function (filter) {
        return filter.$state.store === FilterStateStore.GLOBAL_STATE;
      }).length).to.be(3);
      expect(res.filter(function (filter) {
        return filter.$state.store === FilterStateStore.APP_STATE;
      }).length).to.be(1);
    });

    it('should not affect disabled filters - global state', async function () {
      // test adding to globalState
      const disabledFilters = _.map(filters, function (filter) {
        const f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      await queryFilter.addFilters(disabledFilters, true);
      await queryFilter.addFilters(filters, true);

      const res = queryFilter.getFilters();
      expect(res).to.have.length(6);
    });

    it('should affect disabled filters - app state', async function () {
      // test adding to appState
      const disabledFilters = _.map(filters, function (filter) {
        const f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      await queryFilter.addFilters(disabledFilters, true);
      await queryFilter.addFilters(filters, false);

      const res = queryFilter.getFilters();
      expect(res).to.have.length(6);
    });
  });
});
