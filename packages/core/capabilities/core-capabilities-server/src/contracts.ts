/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { CapabilitiesSwitcher, CapabilitiesProvider } from './capabilities';

/**
 * APIs to manage the {@link Capabilities} that will be used by the application.
 *
 * Plugins relying on capabilities to toggle some of their features should register them during the setup phase
 * using the `registerProvider` method.
 *
 * Plugins having the responsibility to restrict capabilities depending on a given context should register
 * their capabilities switcher using the `registerSwitcher` method.
 *
 * Refers to the methods documentation for complete description and examples.
 *
 * @public
 */
export interface CapabilitiesSetup {
  /**
   * Register a {@link CapabilitiesProvider} to be used to provide {@link Capabilities}
   * when resolving them.
   *
   * @example
   * How to register a plugin's capabilities during setup
   * ```ts
   * // my-plugin/server/plugin.ts
   * public setup(core: CoreSetup, deps: {}) {
   *    core.capabilities.registerProvider(() => {
   *      return {
   *        catalogue: {
   *          myPlugin: true,
   *        },
   *        myPlugin: {
   *          someFeature: true,
   *          featureDisabledByDefault: false,
   *        },
   *      }
   *    });
   * }
   * ```
   */
  registerProvider(provider: CapabilitiesProvider): void;

  /**
   * Register a {@link CapabilitiesSwitcher} to be used to change the default state
   * of the {@link Capabilities} entries when resolving them.
   *
   * A capabilities switcher can only change the state of existing capabilities.
   * Capabilities added or removed when invoking the switcher will be ignored.
   *
   * @example
   * How to restrict some capabilities
   * ```ts
   * // my-plugin/server/plugin.ts
   * public setup(core: CoreSetup, deps: {}) {
   *    core.capabilities.registerSwitcher((request, capabilities, useDefaultCapabilities) => {
   *      // useDefaultCapabilities is a special case that switchers typically don't have to concern themselves with.
   *      // The default capabilities are typically the ones you provide in your CapabilitiesProvider, but this flag
   *      // gives each switcher an opportunity to change the default capabilities of other plugins' capabilities.
   *      // For example, you may decide to flip another plugin's capability to false if today is Tuesday,
   *      // but you wouldn't want to do this when we are requesting the default set of capabilities.
   *      if (useDefaultCapabilities) {
   *        return {
   *          somePlugin: {
   *            featureEnabledByDefault: true
   *          }
   *        }
   *      }
   *      if(myPluginApi.shouldRestrictSomePluginBecauseOf(request)) {
   *        return {
   *          somePlugin: {
   *            featureEnabledByDefault: false // `featureEnabledByDefault` will be disabled. All other capabilities will remain unchanged.
   *          }
   *        }
   *      }
   *      return {}; // All capabilities will remain unchanged.
   *    });
   * }
   * ```
   */
  registerSwitcher(switcher: CapabilitiesSwitcher): void;
}

/**
 * Defines a set of additional options for the `resolveCapabilities` method of {@link CapabilitiesStart}.
 *
 * @public
 */
export interface ResolveCapabilitiesOptions {
  /**
   * Indicates if capability switchers are supposed to return a default set of capabilities.
   */
  useDefaultCapabilities: boolean;
}

/**
 * APIs to access the application {@link Capabilities}.
 *
 * @public
 */
export interface CapabilitiesStart {
  /**
   * Resolve the {@link Capabilities} to be used for given request
   */
  resolveCapabilities(
    request: KibanaRequest,
    options?: ResolveCapabilitiesOptions
  ): Promise<Capabilities>;
}
