describe('get filters', function () {
  var _ = require('lodash');
  var ngMock = require('ngMock');
  var expect = require('expect.js');
  var MockState = require('fixtures/mock_state');
  var storeNames = {
    app: 'appState',
    global: 'globalState'
  };
  var queryFilter;
  var $rootScope;
  var appState;
  var globalState;

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
    $rootScope = _$rootScope_;
    queryFilter = Private(require('ui/filter_bar/query_filter'));
  }));

  describe('getFilters method', function () {
    var filters;

    beforeEach(function () {
      filters = [
        { query: { match: { extension: { query: 'jpg', type: 'phrase' } } } },
        { query: { match: { '@tags': { query: 'info', type: 'phrase' } } } }
      ];
    });

    it('should return app and global filters', function () {
      appState.filters = [filters[0]];
      globalState.filters = [filters[1]];

      // global filters should be listed first
      var res = queryFilter.getFilters();
      expect(res[0]).to.eql(filters[1]);
      expect(res[1]).to.eql(filters[0]);

      // should return updated version of filters
      var newFilter = { query: { match: { '_type': { query: 'nginx', type: 'phrase' } } } };
      appState.filters.push(newFilter);

      res = queryFilter.getFilters();
      expect(res).to.contain(newFilter);
    });

    it('should append the state store', function () {
      appState.filters = [filters[0]];
      globalState.filters = [filters[1]];

      var res = queryFilter.getFilters();
      expect(res[0].$state.store).to.be(storeNames.global);
      expect(res[1].$state.store).to.be(storeNames.app);
    });

    it('should return filters from specific states', function () {
      var states = [
        [ globalState, queryFilter.getGlobalFilters ],
        [ appState, queryFilter.getAppFilters ],
      ];

      _.each(states, function (state) {
        state[0].filters = filters;
        var res = state[1]();
        expect(res.length).to.be(state[0].filters.length);
      });
    });
  });

  describe('filter reconciliation', function () {
    var filters;

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
      var appFilter = _.cloneDeep(filters[1]);
      appState.filters.push(appFilter);

      // global filters should be listed first
      var res = queryFilter.getFilters();
      expect(res).to.have.length(3);
      _.each(res, function (filter) {
        expect(filter.$state.store).to.be('globalState');
      });
    });

    it('should append conflicting appState filters', function () {
      globalState.filters = filters;
      var appFilter = _.cloneDeep(filters[1]);
      appFilter.meta.negate = true;
      appState.filters.push(appFilter);

      // global filters should be listed first
      var res = queryFilter.getFilters();
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
        var f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      _.each(filters, function (filter) { globalState.filters.push(filter); });
      var res = queryFilter.getFilters();
      expect(res).to.have.length(6);

      // test adding to appState
      globalState.filters = _.map(filters, function (filter) {
        var f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      _.each(filters, function (filter) { appState.filters.push(filter); });
      res = queryFilter.getFilters();
      expect(res).to.have.length(6);
    });
  });
});
