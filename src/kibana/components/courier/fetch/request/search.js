define(function (require) {
  return function SearchRequestProvider(Private) {
    var _ = require('lodash');

    var strategy = Private(require('components/courier/fetch/strategy/search'));
    var AbstractRequest = Private(require('components/courier/fetch/request/request'));

    _(SearchRequest).inherits(AbstractRequest);
    var Super = SearchRequest.Super;
    function SearchRequest(source, defer) {
      Super.call(this, source, defer);
    }

    SearchRequest.prototype.type = 'search';
    SearchRequest.prototype.strategy = strategy;

    SearchRequest.prototype.resolve = function (resp) {
      if (resp && resp.hits) {
        resp.hits.hits.forEach(function (hit) {
          hit._source = _.flattenWith('.', hit._source);
        });
      }

      return Super.prototype.resolve.call(this, resp);
    };

    return SearchRequest;
  };
});