import { VisualizeEmbeddableHandler } from './visualize_embeddable_handler';
import { EmbeddableHandlersRegistryProvider } from 'ui/registry/embeddable_handlers';

export function visualizeEmbeddableHandlerProvider(Private) {
  const VisualizeEmbeddableHandlerProvider = ($compile, $rootScope, savedVisualizations) => {
    return new VisualizeEmbeddableHandler($compile, $rootScope, savedVisualizations);
  };
  return Private(VisualizeEmbeddableHandlerProvider);
}

EmbeddableHandlersRegistryProvider.register(visualizeEmbeddableHandlerProvider);
