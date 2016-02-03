import _ from 'lodash';
import CourierFetchStrategySearchProvider from 'ui/courier/fetch/strategy/search';
import CourierFetchRequestRequestProvider from 'ui/courier/fetch/request/request';
export default function SearchReqProvider(Private) {

  var searchStrategy = Private(CourierFetchStrategySearchProvider);
  var AbstractRequest = Private(CourierFetchRequestRequestProvider);

  _.class(SearchReq).inherits(AbstractRequest);
  var Super = SearchReq.Super;
  function SearchReq(source, defer) {
    Super.call(this, source, defer);

    this.type = 'search';
    this.strategy = searchStrategy;
  }

  return SearchReq;
};
