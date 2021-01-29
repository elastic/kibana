/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapValues } from 'lodash';

import { PluginServiceRegistry } from './registry';

export { PluginServiceRegistry } from './registry';
export { PluginServiceProvider, PluginServiceProviders } from './provider';
export {
  PluginServiceFactory,
  KibanaPluginServiceFactory,
  KibanaPluginServiceParams,
} from './factory';

/**
 * `PluginServices` is a top-level class for specifying and accessing services within a plugin.
 *
 * A `PluginServices` object can be provided with a `PluginServiceRegistry` at any time, which will
 * then be used to provide services to any component that accesses it.
 *
 * The `Services` generic determines the shape of all service APIs being produced.
 */
export class PluginServices<Services> {
  private registry: PluginServiceRegistry<Services, any> | null = null;

  /**
   * Supply a `PluginServiceRegistry` for the class to use to provide services and context.
   *
   * @param registry A setup and started `PluginServiceRegistry`.
   */
  setRegistry(registry: PluginServiceRegistry<Services, any> | null) {
    if (registry && !registry.isStarted()) {
      throw new Error('Registry has not been started.');
    }

    this.registry = registry;
  }

  /**
   * Returns true if a registry has been provided, false otherwise.
   */
  hasRegistry() {
    return !!this.registry;
  }

  /**
   * Private getter that will enforce proper setup throughout the class.
   */
  private getRegistry() {
    if (!this.registry) {
      throw new Error('No registry has been provided.');
    }

    return this.registry;
  }

  /**
   * Return the React Context Provider that will supply services.
   */
  getContextProvider() {
    return this.getRegistry().getContextProvider();
  }

  /**
   * Return a map of React Hooks that can be used in React components.
   */
  getHooks(): { [K in keyof Services]: { useService: () => Services[K] } } {
    const registry = this.getRegistry();
    const providers = registry.getServiceProviders();

    // @ts-expect-error Need to fix this; the type isn't fully understood when inferred.
    return mapValues(providers, (provider) => ({
      useService: provider.getUseServiceHook(),
    }));
  }
}
