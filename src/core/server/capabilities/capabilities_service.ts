/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Capabilities, CapabilitiesProvider, CapabilitiesSwitcher } from './types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { InternalHttpServiceSetup, KibanaRequest } from '../http';
import { mergeCapabilities } from './merge_capabilities';
import { getCapabilitiesResolver, CapabilitiesResolver } from './resolve_capabilities';
import { registerRoutes } from './routes';

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
   *    core.capabilities.registerSwitcher((request, capabilities) => {
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
 * APIs to access the application {@link Capabilities}.
 *
 * @public
 */
export interface CapabilitiesStart {
  /**
   * Resolve the {@link Capabilities} to be used for given request
   */
  resolveCapabilities(request: KibanaRequest): Promise<Capabilities>;
}

interface SetupDeps {
  http: InternalHttpServiceSetup;
}

const defaultCapabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
};

/** @internal */
export class CapabilitiesService {
  private readonly logger: Logger;
  private readonly capabilitiesProviders: CapabilitiesProvider[] = [];
  private readonly capabilitiesSwitchers: CapabilitiesSwitcher[] = [];
  private readonly resolveCapabilities: CapabilitiesResolver;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('capabilities-service');
    this.resolveCapabilities = getCapabilitiesResolver(
      () =>
        mergeCapabilities(
          defaultCapabilities,
          ...this.capabilitiesProviders.map(provider => provider())
        ),
      () => this.capabilitiesSwitchers
    );
  }

  public setup(setupDeps: SetupDeps): CapabilitiesSetup {
    this.logger.debug('Setting up capabilities service');

    registerRoutes(setupDeps.http, this.resolveCapabilities);

    return {
      registerProvider: (provider: CapabilitiesProvider) => {
        this.capabilitiesProviders.push(provider);
      },
      registerSwitcher: (switcher: CapabilitiesSwitcher) => {
        this.capabilitiesSwitchers.push(switcher);
      },
    };
  }

  public start(): CapabilitiesStart {
    return {
      resolveCapabilities: request => this.resolveCapabilities(request, []),
    };
  }
}
