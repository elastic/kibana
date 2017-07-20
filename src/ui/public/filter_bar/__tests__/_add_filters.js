import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import MockState from 'fixtures/mock_state';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

describe('add filters', function () {
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
      $provide.service('courier', require('fixtures/mock_courier'));

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
    it('should add filters to appState', function () {
      $rootScope.$digest();

      queryFilter.addFilters(filters);
      $rootScope.$digest();

      expect(appState.filters.length).to.be(3);
      expect(globalState.filters.length).to.be(0);
    });

    it('should add filters to globalState', function () {
      $rootScope.$digest();

      queryFilter.addFilters(filters, true);
      $rootScope.$digest();

      expect(appState.filters.length).to.be(0);
      expect(globalState.filters.length).to.be(3);
    });

    it('should accept a single filter', function () {
      $rootScope.$digest();

      queryFilter.addFilters(filters[0]);
      $rootScope.$digest();

      expect(appState.filters.length).to.be(1);
      expect(globalState.filters.length).to.be(0);
    });

    it('should fire the update and fetch events', function () {
      const emitSpy = sinon.spy(queryFilter, 'emit');

      // set up the watchers, add new filters, and crank the digest loop
      $rootScope.$digest();
      queryFilter.addFilters(filters);
      $rootScope.$digest();

      // updates should trigger state saves
      expect(appState.save.callCount).to.be(1);
      expect(globalState.save.callCount).to.be(1);

      // this time, events should be emitted
      expect(emitSpy.callCount).to.be(2);
      expect(emitSpy.firstCall.args[0]).to.be('update');
      expect(emitSpy.secondCall.args[0]).to.be('fetch');

    });
  });

  describe('filter reconciliation', function () {
    it('should de-dupe appState filters being added', function () {
      const newFilter = _.cloneDeep(filters[1]);
      appState.filters = filters;
      $rootScope.$digest();
      expect(appState.filters.length).to.be(3);

      queryFilter.addFilters(newFilter);
      $rootScope.$digest();
      expect(appState.filters.length).to.be(3);
    });

    it('should de-dupe globalState filters being added', function () {
      const newFilter = _.cloneDeep(filters[1]);
      globalState.filters = filters;
      $rootScope.$digest();
      expect(globalState.filters.length).to.be(3);

      queryFilter.addFilters(newFilter, true);
      $rootScope.$digest();
      expect(globalState.filters.length).to.be(3);
    });

    it('should mutate global filters on appState filter changes', function () {
      const idx = 1;
      globalState.filters = filters;
      $rootScope.$digest();

      const appFilter = _.cloneDeep(filters[idx]);
      appFilter.meta.negate = true;
      queryFilter.addFilters(appFilter);
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
