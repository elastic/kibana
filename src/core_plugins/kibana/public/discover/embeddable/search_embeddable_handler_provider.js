import { SearchEmbeddableHandler } from './search_embeddable_handler';
import { EmbeddableHandlersRegistryProvider } from 'ui/embeddable/embeddable_handlers_registry';

export function searchEmbeddableHandlerProvider(Private) {
  const SearchEmbeddableHandlerProvider = ($compile, $rootScope, savedSearches, Promise) => {
    return new SearchEmbeddableHandler($compile, $rootScope, savedSearches, Promise);
  };
  return Private(SearchEmbeddableHandlerProvider);
}


EmbeddableHandlersRegistryProvider.register(searchEmbeddableHandlerProvider);
