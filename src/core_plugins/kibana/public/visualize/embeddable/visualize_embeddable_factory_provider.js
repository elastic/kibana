import { VisualizeEmbeddableFactory } from './visualize_embeddable_factory';
import { EmbeddableFactoriesRegistryProvider } from 'ui/embeddable/embeddable_factories_registry';

export function visualizeEmbeddableFactoryProvider(Private) {
  const VisualizeEmbeddableFactoryProvider = (
    savedVisualizations,
    savedSearches,
    timefilter,
    Private,
    config) => {
    return new VisualizeEmbeddableFactory(savedVisualizations, savedSearches, timefilter, Private, config);
  };
  return Private(VisualizeEmbeddableFactoryProvider);
}

EmbeddableFactoriesRegistryProvider.register(visualizeEmbeddableFactoryProvider);
