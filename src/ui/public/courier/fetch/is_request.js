import { SearchRequestProvider } from './request';

export function IsRequestProvider(Private) {
  const SearchRequest = Private(SearchRequestProvider);

  return function isRequest(obj) {
    return obj instanceof SearchRequest;
  };
}
