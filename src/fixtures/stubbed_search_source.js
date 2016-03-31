import sinon from 'auto-release-sinon';
import searchResponse from 'fixtures/search_response';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

export default function stubSearchSource(Private, $q, Promise) {
  let deferedResult = $q.defer();
  let indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

  return {
    sort: sinon.spy(),
    size: sinon.spy(),
    fetch: sinon.spy(),
    destroy: sinon.spy(),
    get: function (param) {
      switch (param) {
        case 'index':
          return indexPattern;
        default:
          throw new Error('Param "' + param + '" is not implemented in the stubbed search source');
      }
    },
    crankResults: function () {
      deferedResult.resolve(searchResponse);
      deferedResult = $q.defer();
    },
    onResults: function () {
      // Up to the test to resolve this manually
      // For example:
      // someHandler.resolve(require('fixtures/search_response'))
      return deferedResult.promise;
    },
    onError: function () { return $q.defer().promise; },
    _flatten: function () {
      return Promise.resolve({ index: indexPattern, body: {} });
    }
  };

};
