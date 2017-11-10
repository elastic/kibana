import sinon from 'sinon';
import { createStubHits } from './hits';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';

export function StubSearchSourceProvider(Private, $q, Promise) {
  let deferedResult = $q.defer();
  const indexPattern = Private(StubLogstashIndexPatternProvider);

  let onResultsCount = 0;
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
      deferedResult.resolve({
        took: 73,
        timed_out: false,
        _shards: {
          total: 144,
          successful: 144,
          failed: 0
        },
        hits: {
          total: 49487,
          max_score: 1.0,
          hits: createStubHits()
        }
      });
      deferedResult = $q.defer();
    },
    onResults: function () {
      onResultsCount++;

      // Up to the test to resolve this manually
      // For example:
      // someHandler.resolve(require('fixtures/search_response'))
      return deferedResult.promise;
    },
    getOnResultsCount: function () {
      return onResultsCount;
    },
    _flatten: function () {
      return Promise.resolve({ index: indexPattern, body: {} });
    },
    _requestStartHandlers: [],
    onRequestStart(fn) {
      this._requestStartHandlers.push(fn);
    },
    requestIsStarting(req) {
      return Promise.map(this._requestStartHandlers, fn => fn(req));
    },
    requestIsStopped() {}
  };

}
