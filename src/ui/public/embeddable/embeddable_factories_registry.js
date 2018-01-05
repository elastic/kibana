import { uiRegistry } from 'ui/registry/_registry';

/**
 * Registry of functions (EmbeddableFactoryProviders) which return an EmbeddableFactory.
 */
export const EmbeddableFactoriesRegistryProvider = uiRegistry({
  name: 'embeddableFactories',
  index: ['name']
});

