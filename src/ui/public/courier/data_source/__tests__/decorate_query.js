import moment from 'moment';
import expect from 'expect.js';
import ngMock from 'ngMock';
import _ from 'lodash';
import CourierDataSourceDecorateQueryProvider from 'ui/courier/data_source/_decorate_query';

describe('Query decorator', function () {

  var config;

  var indexPattern;

  var getComputedFields;

  var fn;
  beforeEach(ngMock.module(
    'kibana',
    function ($provide) {
      // Super simple config stub
      $provide.service('config', function () {
        var keys = {};
        return {
          get: function (key) { return keys[key]; },
          set: function (key, value) { keys[key] = value; }
        };
      });
    }
  ));

  beforeEach(ngMock.inject(function (Private, $injector, _config_) {
    config = _config_;
    fn = Private(CourierDataSourceDecorateQueryProvider);
  }));

  it('should be a function', function () {
    expect(fn).to.be.a(Function);
  });

  it('should merge in the query string options', function () {
    config.set('query:queryString:options', {analyze_wildcard: true});
    expect(fn({query_string: {query: '*'}})).to.eql({query_string: {query: '*', analyze_wildcard: true}});
  });

});
