describe('invert filters', function () {
  var _ = require('lodash');
  var sinon = require('auto-release-sinon');
  var expect = require('expect.js');
  var ngMock = require('ngMock');
  var MockState = require('fixtures/mock_state');
  var storeNames = {
    app: 'appState',
    global: 'globalState'
  };
  var filters;
  var queryFilter;
  var $rootScope;
  var appState;
  var globalState;

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
    queryFilter = Private(require('ui/filter_bar/query_filter'));

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
      var emitSpy = sinon.spy(queryFilter, 'emit');
      appState.filters = filters;

      // set up the watchers
      $rootScope.$digest();
      queryFilter.invertFilter(filters[1]);
      // trigger the digest loop to fire the watchers
      $rootScope.$digest();

      expect(emitSpy.callCount).to.be(2);
      expect(emitSpy.firstCall.args[0]).to.be('update');
      expect(emitSpy.secondCall.args[0]).to.be('fetch');
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
