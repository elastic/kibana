import { VisualizeEmbeddableHandler } from './visualize_embeddable_handler';

export function visualizeEmbeddableHandlerProvider(Private) {
  const VisualizeEmbeddableHandlerProvider = ($compile, $rootScope, savedVisualizations) => {
    return new VisualizeEmbeddableHandler($compile, $rootScope, savedVisualizations);
  };
  return Private(VisualizeEmbeddableHandlerProvider);
}
