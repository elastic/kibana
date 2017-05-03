import { SearchEmbeddableHandler } from './search_embeddable_handler';

export function searchEmbeddableHandlerProvider(Private) {
  const SearchEmbeddableHandlerProvider = ($compile, $rootScope, savedSearches, Private) => {
    return new SearchEmbeddableHandler($compile, $rootScope, savedSearches, Private);
  };
  return Private(SearchEmbeddableHandlerProvider);
}
