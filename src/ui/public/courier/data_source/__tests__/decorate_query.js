import expect from 'expect.js';
import ngMock from 'ng_mock';
import { DecorateQueryProvider } from 'ui/courier/data_source/_decorate_query';

describe('Query decorator', function () {
  let config;

  let fn;
  beforeEach(ngMock.module(
    'kibana',
    function ($provide) {
      // Super simple config stub
      $provide.service('config', function () {
        const keys = {};
        return {
          get: function (key) { return keys[key]; },
          set: function (key, value) { keys[key] = value; }
        };
      });
    }
  ));

  beforeEach(ngMock.inject(function (Private, $injector, _config_) {
    config = _config_;
    fn = Private(DecorateQueryProvider);
  }));

  it('should be a function', function () {
    expect(fn).to.be.a(Function);
  });

  it('should merge in the query string options', function () {
    config.set('query:queryString:options', { analyze_wildcard: true });
    expect(fn({ query_string: { query: '*' } })).to.eql({ query_string: { query: '*', analyze_wildcard: true } });
  });
});
