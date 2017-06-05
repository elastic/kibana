import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import MockState from 'fixtures/mock_state';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

describe('remove filters', function () {
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

  describe('removing a filter', function () {
    it('should remove the filter from appState', function () {
      appState.filters = filters;
      expect(appState.filters).to.have.length(3);
      queryFilter.removeFilter(filters[0]);
      expect(appState.filters).to.have.length(2);
    });

    it('should remove the filter from globalState', function () {
      globalState.filters = filters;
      expect(globalState.filters).to.have.length(3);
      queryFilter.removeFilter(filters[0]);
      expect(globalState.filters).to.have.length(2);
    });

    it('should fire the update and fetch events', function () {
      const emitSpy = sinon.spy(queryFilter, 'emit');
      appState.filters = filters;
      $rootScope.$digest();

      queryFilter.removeFilter(filters[0]);
      $rootScope.$digest();

      expect(emitSpy.callCount).to.be(2);
      expect(emitSpy.firstCall.args[0]).to.be('update');
      expect(emitSpy.secondCall.args[0]).to.be('fetch');
    });

    it('should remove matching filters', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      $rootScope.$digest();

      queryFilter.removeFilter(filters[0]);
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(1);
    });

    it('should remove matching filters by comparison', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      $rootScope.$digest();

      queryFilter.removeFilter(_.cloneDeep(filters[0]));
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(1);

      queryFilter.removeFilter(_.cloneDeep(filters[2]));
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(0);
    });

    it('should do nothing with a non-matching filter', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      $rootScope.$digest();

      const missedFilter = _.cloneDeep(filters[0]);
      missedFilter.meta = {
        negate: !filters[0].meta.negate
      };

      queryFilter.removeFilter(missedFilter);
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(2);
      expect(appState.filters).to.have.length(1);
    });
  });

  describe('bulk removal', function () {
    it('should remove all the filters from both states', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      expect(globalState.filters).to.have.length(2);
      expect(appState.filters).to.have.length(1);

      queryFilter.removeAll();
      expect(globalState.filters).to.have.length(0);
      expect(appState.filters).to.have.length(0);
    });
  });
});
