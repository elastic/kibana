import { VisualizeEmbeddableHandler } from './visualize_embeddable_handler';
import { EmbeddableHandlersRegistryProvider } from 'ui/registry/embeddable_handlers';

export function visualizeEmbeddableHandlerProvider(Private) {
  const VisualizeEmbeddableHandlerProvider = ($compile, $rootScope, savedVisualizations, timefilter, Notifier) => {
    return new VisualizeEmbeddableHandler($compile, $rootScope, savedVisualizations, timefilter, Notifier);
  };
  return Private(VisualizeEmbeddableHandlerProvider);
}

EmbeddableHandlersRegistryProvider.register(visualizeEmbeddableHandlerProvider);
