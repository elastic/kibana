import { SearchEmbeddableFactory } from './search_embeddable_factory';
import { EmbeddableFactoriesRegistryProvider } from 'ui/embeddable/embeddable_factories_registry';

export function searchEmbeddableFactoryProvider(Private) {
  const SearchEmbeddableFactoryProvider = ($compile, $rootScope, savedSearches, Promise, courier) => {
    return new SearchEmbeddableFactory($compile, $rootScope, savedSearches, Promise, courier);
  };
  return Private(SearchEmbeddableFactoryProvider);
}


EmbeddableFactoriesRegistryProvider.register(searchEmbeddableFactoryProvider);
