define(function (require) {
  return function SearchReqProvider(Private) {
    let _ = require('lodash');

    let searchStrategy = Private(require('ui/courier/fetch/strategy/search'));
    let AbstractRequest = Private(require('ui/courier/fetch/request/request'));

    _.class(SearchReq).inherits(AbstractRequest);
    let Super = SearchReq.Super;
    function SearchReq(source, defer) {
      Super.call(this, source, defer);

      this.type = 'search';
      this.strategy = searchStrategy;
    }

    return SearchReq;
  };
});
