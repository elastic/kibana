import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import MockState from 'fixtures/mock_state';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

describe('pin filters', function () {
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
        query: { match: { extension: { query: 'gif', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
        meta: { negate: true, disabled: false }
      },
      {
        query: { match: { extension: { query: 'png', type: 'phrase' } } },
        meta: { negate: true, disabled: true }
      },
      {
        query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { '@tags': { query: 'success', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { '@tags': { query: 'security', type: 'phrase' } } },
        meta: { negate: true, disabled: false }
      },
      {
        query: { match: { '_type': { query: 'nginx', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { '_type': { query: 'apache', type: 'phrase' } } },
        meta: { negate: true, disabled: true }
      }
    ];
  }));

  describe('pin a filter', function () {
    beforeEach(function () {
      globalState.filters = _.filter(filters, function (filter) {
        return !!filter.query.match._type;
      });
      appState.filters = _.filter(filters, function (filter) {
        return !filter.query.match._type;
      });
      expect(globalState.filters).to.have.length(2);
      expect(appState.filters).to.have.length(6);
    });

    it('should move filter from appState to globalState', function () {
      const filter = appState.filters[1];

      queryFilter.pinFilter(filter);
      expect(globalState.filters).to.contain(filter);
      expect(globalState.filters).to.have.length(3);
      expect(appState.filters).to.have.length(5);
    });

    it('should move filter from globalState to appState', function () {
      const filter = globalState.filters[1];

      queryFilter.pinFilter(filter);
      expect(appState.filters).to.contain(filter);
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(7);
    });


    it('should only fire the update event', function () {
      const emitSpy = sinon.spy(queryFilter, 'emit');
      const filter = appState.filters[1];
      $rootScope.$digest();

      queryFilter.pinFilter(filter);
      $rootScope.$digest();

      expect(emitSpy.callCount).to.be(1);
      expect(emitSpy.firstCall.args[0]).to.be('update');
    });
  });

  describe('bulk pinning', function () {
    beforeEach(function () {
      globalState.filters = _.filter(filters, function (filter) {
        return !!filter.query.match.extension;
      });
      appState.filters = _.filter(filters, function (filter) {
        return !filter.query.match.extension;
      });
      expect(globalState.filters).to.have.length(3);
      expect(appState.filters).to.have.length(5);
    });

    it('should swap the filters in both states', function () {
      const appSample = _.sample(appState.filters);
      const globalSample = _.sample(globalState.filters);

      queryFilter.pinAll();
      expect(globalState.filters).to.have.length(5);
      expect(appState.filters).to.have.length(3);

      expect(globalState.filters).to.contain(appSample);
      expect(appState.filters).to.contain(globalSample);
    });

    it('should move all filters to globalState', function () {
      queryFilter.pinAll(true);
      expect(globalState.filters).to.have.length(8);
      expect(appState.filters).to.have.length(0);
    });

    it('should move all filters to appState', function () {
      queryFilter.pinAll(false);
      expect(globalState.filters).to.have.length(0);
      expect(appState.filters).to.have.length(8);
    });
  });
});
