import _ from 'lodash';

import SearchStrategyProvider from '../strategy/search';
import AbstractRequestProvider from './request';

export default function SearchReqProvider(Private) {

  const searchStrategy = Private(SearchStrategyProvider);
  const AbstractRequest = Private(AbstractRequestProvider);

  _.class(SearchReq).inherits(AbstractRequest);
  const Super = SearchReq.Super;
  function SearchReq(source, defer) {
    Super.call(this, source, defer);

    this.type = 'search';
    this.strategy = searchStrategy;
  }

  return SearchReq;
};
