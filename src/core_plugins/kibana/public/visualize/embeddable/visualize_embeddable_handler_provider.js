import { VisualizeEmbeddableHandler } from './visualize_embeddable_handler';
import { EmbeddableHandlersRegistryProvider } from 'ui/embeddable/embeddable_handlers_registry';

export function visualizeEmbeddableHandlerProvider(Private) {
  const VisualizeEmbeddableHandlerProvider = (
    $compile,
    $rootScope,
    savedVisualizations,
    timefilter,
    Notifier,
    Promise) => {
    return new VisualizeEmbeddableHandler($compile, $rootScope, savedVisualizations, timefilter, Notifier, Promise);
  };
  return Private(VisualizeEmbeddableHandlerProvider);
}

EmbeddableHandlersRegistryProvider.register(visualizeEmbeddableHandlerProvider);
