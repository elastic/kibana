import _ from 'lodash';
import sinon from 'sinon';
import MockState from 'fixtures/mock_state';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterManagerProvider } from 'ui/filter_manager';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { getPhraseScript } from '../lib/phrase';
let queryFilter;
let filterManager;
let appState;

function checkAddFilters(length, comps, idx) {
  idx = idx || 0;
  const filters = queryFilter.addFilters.getCall(idx).args[0];

  expect(filters.length).to.be(length);
  if (!_.isArray(comps)) return;
  comps.forEach(function (comp, i) {
    expect(filters[i]).to.eql(comp);
  });
}

describe('Filter Manager', function () {
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
    }
  ));

  beforeEach(ngMock.inject(function (_$rootScope_, Private) {
    filterManager = Private(FilterManagerProvider);

    // mock required queryFilter methods, used in the manager
    queryFilter = Private(FilterBarQueryFilterProvider);
    sinon.stub(queryFilter, 'getAppFilters', function () {
      return appState.filters;
    });
    sinon.stub(queryFilter, 'addFilters', function (filters) {
      if (!_.isArray(filters)) filters = [filters];
      appState.filters = appState.filters.concat(filters);
    });
    sinon.stub(queryFilter, 'invertFilter', function (filter) {
      filter.meta.negate = !filter.meta.negate;
    });
  }));

  it('should have an `add` function', function () {
    expect(filterManager.add).to.be.a(Function);
  });

  it('should add a filter', function () {
    filterManager.add('myField', 1, '+', 'myIndex');
    expect(queryFilter.addFilters.callCount).to.be(1);
    checkAddFilters(1, [{
      meta: { index: 'myIndex', negate: false },
      query: { match: { myField: { query: 1, type: 'phrase' } } }
    }]);
  });

  it('should add multiple filters if passed an array of values', function () {
    filterManager.add('myField', [1, 2, 3], '+', 'myIndex');
    expect(queryFilter.addFilters.callCount).to.be(1);
    checkAddFilters(3, [{
      meta: { index: 'myIndex', negate: false },
      query: { match: { myField: { query: 1, type: 'phrase' } } }
    }, {
      meta: { index: 'myIndex', negate: false },
      query: { match: { myField: { query: 2, type: 'phrase' } } }
    }, {
      meta: { index: 'myIndex', negate: false },
      query: { match: { myField: { query: 3, type: 'phrase' } } }
    }]);
  });

  it('should add an exists filter if _exists_ is used as the field', function () {
    filterManager.add('_exists_', 'myField', '+', 'myIndex');
    checkAddFilters(1, [{
      meta: { index: 'myIndex', negate: false },
      exists: { field: 'myField' }
    }]);
  });

  it('should negate existing filter instead of added a conflicting filter', function () {
    filterManager.add('myField', 1, '+', 'myIndex');
    checkAddFilters(1, [{
      meta: { index: 'myIndex', negate: false },
      query: { match: { myField: { query: 1, type: 'phrase' } } }
    }], 0);
    expect(appState.filters).to.have.length(1);

    // NOTE: negating exists filters also forces disabled to false
    filterManager.add('myField', 1, '-', 'myIndex');
    checkAddFilters(0, null, 1);
    expect(appState.filters).to.have.length(1);

    filterManager.add('_exists_', 'myField', '+', 'myIndex');
    checkAddFilters(1, [{
      meta: { index: 'myIndex', negate: false },
      exists: { field: 'myField' }
    }], 2);
    expect(appState.filters).to.have.length(2);

    filterManager.add('_exists_', 'myField', '-', 'myIndex');
    checkAddFilters(0, null, 3);
    expect(appState.filters).to.have.length(2);

    const scriptedField = { name: 'scriptedField', scripted: true, script: 1, lang: 'painless' };
    filterManager.add(scriptedField, 1, '+', 'myIndex');
    checkAddFilters(1, [{
      meta: { index: 'myIndex', negate: false, field: 'scriptedField' },
      script: getPhraseScript(scriptedField, 1)
    }], 4);
    expect(appState.filters).to.have.length(3);

    filterManager.add(scriptedField, 1, '-', 'myIndex');
    checkAddFilters(0, null, 5);
    expect(appState.filters).to.have.length(3);
  });

  it('should enable matching filters being changed', function () {
    _.each([true, false], function (negate) {
      appState.filters = [{
        query: { match: { myField: { query: 1 } } },
        meta: { disabled: true, negate: negate }
      }];
      expect(appState.filters.length).to.be(1);
      expect(appState.filters[0].meta.disabled).to.be(true);

      filterManager.add('myField', 1, '+', 'myIndex');
      expect(appState.filters.length).to.be(1);
      expect(appState.filters[0].meta.disabled).to.be(false);
    });
  });
});
