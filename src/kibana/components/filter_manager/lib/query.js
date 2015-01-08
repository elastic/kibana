define(function (require) {
  var _ = require('lodash');
  return function buildPhraseFilter(query, index) {
    return {
      query: query,
      meta: {
        index: index
      }
    };
  };
});