define(function (require) {
  return function SearchReqProvider(Private) {
    var _ = require('lodash');

    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var AbstractRequest = Private(require('components/courier/fetch/request/request'));

    _(SearchReq).inherits(AbstractRequest);
    var Super = SearchReq.Super;
    function SearchReq(source, defer) {
      Super.call(this, source, defer);

      this.type = 'search';
      this.strategy = searchStrategy;
    }

    SearchReq.prototype.transformResponse = function (resp) {
      if (resp && resp.hits) {
        resp.hits.hits.forEach(function (hit) {
          hit._source = _.flattenWith('.', hit._source);
        });
      }

      return resp;
    };

    return SearchReq;
  };
});