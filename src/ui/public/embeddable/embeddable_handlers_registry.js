import { uiRegistry } from 'ui/registry/_registry';

/**
 * Registry of functions (EmbeddableHandlerProviders) which return an EmbeddableHandler.
 */
export const EmbeddableHandlersRegistryProvider = uiRegistry({
  name: 'embeddableHandlers',
  index: ['name']
});
