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
  }));

  describe('updating', function () {
    var currentFilter;
    var newFilter;

    beforeEach(function () {
      newFilter = _.cloneDeep({
        query: {
          match: {
            extension: {
              query: 'jpg',
              type: 'phrase'
            }
          }
        }
      });
      currentFilter = _.assign(_.cloneDeep(newFilter), {
        meta: {}
      });
    });

    it('should be able to update a filter', function () {
      newFilter.query.match.extension.query = 'png';

      expect(currentFilter.query.match.extension.query).to.be('jpg');
      queryFilter.updateFilter({
        source: currentFilter,
        model: newFilter,
        type: 'query'
      });
      $rootScope.$digest();
      expect(currentFilter.query.match.extension.query).to.be('png');
    });

    it('should set an alias in the meta object', function () {

      queryFilter.updateFilter({
        source: currentFilter,
        model: newFilter,
        type: 'query',
        alias: 'foo'
      });
      $rootScope.$digest();
      expect(currentFilter.meta.alias).to.be('foo');
    });

    it('should replace the filter type if it is changed', function () {
      newFilter = {
        'range': {
          'bytes': {
            'gte': 0,
            'lt': 1000
          }
        }
      };

      expect(currentFilter.query).not.to.be(undefined);

      queryFilter.updateFilter({
        source: currentFilter,
        model: newFilter,
        type: 'query'
      });
      $rootScope.$digest();

      expect(currentFilter.query).to.be(undefined);
      expect(currentFilter.range).not.to.be(undefined);
      expect(_.eq(currentFilter.range, newFilter.range)).to.be(true);
    });

  });
});
