define(function (require) {
  var sinon = require('auto-release-sinon');
  var searchResponse = require('fixtures/search_response');

  return function stubSearchSource(Private, $q) {
    var deferedResult = $q.defer();

    return {
      sort: sinon.spy(),
      size: sinon.spy(),
      fetch: sinon.spy(),
      destroy: sinon.spy(),
      get: function (param) {
        switch (param) {
          case 'index':
            return Private(require('fixtures/stubbed_logstash_index_pattern'));
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

    };

  };
});
