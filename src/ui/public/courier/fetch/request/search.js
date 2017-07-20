import { SearchStrategyProvider } from '../strategy/search';
import { AbstractRequestProvider } from './request';

export function SearchRequestProvider(Private) {

  const searchStrategy = Private(SearchStrategyProvider);
  const AbstractRequest = Private(AbstractRequestProvider);

  return class SearchReq extends AbstractRequest {
    constructor(...args) {
      super(...args);

      this.type = 'search';
      this.strategy = searchStrategy;
    }
  };
}
