describe('get filters', function () {
  var _ = require('lodash');
  var ngMock = require('ngMock');
  var expect = require('expect.js');
  var MockState = require('fixtures/mock_state');
  var storeNames = {
    app: 'appState',
    global: 'globalState'
  };
  var filter, queryFilter;
  var $rootScope, appState, globalState;

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

    filter = {
      query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
      meta: { negate: false, disabled: false }
    };
  }));

  describe('editing filters', function () {
    describe('edit query', function () {
      it('should stringify the current state', function () {
        var stringifiedQuery = queryFilter.stringifyQuery(filter);
        expect(typeof stringifiedQuery).to.be('string');
        expect(_.isEqual(JSON.parse(stringifiedQuery), filter.query.match)).to.be(true);
      });
    });
  });
});
