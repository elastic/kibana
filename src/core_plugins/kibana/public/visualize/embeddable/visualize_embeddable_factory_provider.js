import { VisualizeEmbeddableFactory } from './visualize_embeddable_factory';
import { EmbeddableFactoriesRegistryProvider } from 'ui/embeddable/embeddable_factories_registry';

export function visualizeEmbeddableFactoryProvider(Private) {
  const VisualizeEmbeddableFactoryProvider = (
    savedVisualizations,
    Promise,
    config) => {
    return new VisualizeEmbeddableFactory(savedVisualizations, Promise, config);
  };
  return Private(VisualizeEmbeddableFactoryProvider);
}

EmbeddableFactoriesRegistryProvider.register(visualizeEmbeddableFactoryProvider);
