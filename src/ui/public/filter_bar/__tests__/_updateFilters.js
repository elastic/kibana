describe('update filters', function () {
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
  var appState;
  var globalState;
  var $rootScope;

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

  beforeEach(ngMock.inject(function (Private, _$rootScope_) {
    $rootScope = _$rootScope_;
    queryFilter = Private(require('ui/filter_bar/query_filter'));
    filters = [
      {
        query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      }
    ];
  }));

  describe('updating', function () {
    var currentFilter;
    var newFilter;

    beforeEach(function () {
      currentFilter = filters[0];
      newFilter = _.cloneDeep(currentFilter);
      delete newFilter.meta;
    });

    it('should be able to update a filter', function () {
      newFilter.query.match.extension.query = 'png';

      expect(currentFilter.query.match.extension.query).to.be('jpg');
      queryFilter.updateFilter({
        source: currentFilter,
        model: JSON.stringify(newFilter)
      });
      $rootScope.$digest();
      expect(currentFilter.query.match.extension.query).to.be('png');
    });
  });
});
