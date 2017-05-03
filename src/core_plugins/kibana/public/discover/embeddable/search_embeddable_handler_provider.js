import { SearchEmbeddableHandler } from './search_embeddable_handler';
import { EmbeddableHandlersRegistryProvider } from 'ui/registry/embeddable_handlers';

export function searchEmbeddableHandlerProvider(Private) {
  const SearchEmbeddableHandlerProvider = ($compile, $rootScope, savedSearches, Private) => {
    return new SearchEmbeddableHandler($compile, $rootScope, savedSearches, Private);
  };
  return Private(SearchEmbeddableHandlerProvider);
}


EmbeddableHandlersRegistryProvider.register(searchEmbeddableHandlerProvider);
