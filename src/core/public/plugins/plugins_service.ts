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

import { CoreSetup, CoreStart } from '..';
import { PluginName } from '../../server';
import { CoreService } from '../../types';
import { CoreContext } from '../core_system';
import { PluginWrapper } from './plugin';
import {
  createPluginInitializerContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';

/** @internal */
export type PluginsServiceSetupDeps = CoreSetup;
/** @internal */
export type PluginsServiceStartDeps = CoreStart;

/** @internal */
export interface PluginsServiceSetup {
  contracts: Map<string, unknown>;
}
/** @internal */
export interface PluginsServiceStart {
  contracts: Map<string, unknown>;
}

/**
 * Service responsible for loading plugin bundles, initializing plugins, and managing the lifecycle
 * of all plugins.
 *
 * @internal
 */
export class PluginsService implements CoreService<PluginsServiceSetup, PluginsServiceStart> {
  /** Plugin wrappers in topological order. */
  private readonly plugins: Map<
    PluginName,
    PluginWrapper<unknown, Record<string, unknown>>
  > = new Map();
  private readonly satupPlugins: PluginName[] = [];

  constructor(private readonly coreContext: CoreContext) {}

  public async setup(deps: PluginsServiceSetupDeps) {
    // Construct plugin wrappers, depending on the topological order set by the server.
    deps.injectedMetadata
      .getPlugins()
      .forEach(({ id, plugin }) =>
        this.plugins.set(
          id,
          new PluginWrapper(plugin, createPluginInitializerContext(deps, plugin))
        )
      );

    // Load plugin bundles
    await this.loadPluginBundles(deps.basePath.addToPath);

    // Setup each plugin with required and optional plugin contracts
    const contracts = new Map<string, unknown>();
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const pluginDeps = new Set([
        ...plugin.requiredPlugins,
        ...plugin.optionalPlugins.filter(optPlugin => this.plugins.get(optPlugin)),
      ]);

      const pluginDepContracts = [...pluginDeps.keys()].reduce(
        (depContracts, dependencyName) => {
          // Only set if present. Could be absent if plugin does not have client-side code or is a
          // missing optional plugin.
          if (contracts.has(dependencyName)) {
            depContracts[dependencyName] = contracts.get(dependencyName);
          }

          return depContracts;
        },
        {} as Record<PluginName, unknown>
      );

      contracts.set(
        pluginName,
        await plugin.setup(
          createPluginSetupContext(this.coreContext, deps, plugin),
          pluginDepContracts
        )
      );

      this.satupPlugins.push(pluginName);
    }

    // Expose setup contracts
    return { contracts };
  }

  public async start(deps: PluginsServiceStartDeps) {
    // Setup each plugin with required and optional plugin contracts
    const contracts = new Map<string, unknown>();
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const pluginDeps = new Set([
        ...plugin.requiredPlugins,
        ...plugin.optionalPlugins.filter(optPlugin => this.plugins.get(optPlugin)),
      ]);

      const pluginDepContracts = [...pluginDeps.keys()].reduce(
        (depContracts, dependencyName) => {
          // Only set if present. Could be absent if plugin does not have client-side code or is a
          // missing optional plugin.
          if (contracts.has(dependencyName)) {
            depContracts[dependencyName] = contracts.get(dependencyName);
          }

          return depContracts;
        },
        {} as Record<PluginName, unknown>
      );

      contracts.set(
        pluginName,
        await plugin.start(
          createPluginStartContext(this.coreContext, deps, plugin),
          pluginDepContracts
        )
      );
    }

    // Expose start contracts
    return { contracts };
  }

  public async stop() {
    // Stop plugins in reverse topological order.
    for (const pluginName of this.satupPlugins.reverse()) {
      this.plugins.get(pluginName)!.stop();
    }
  }

  private loadPluginBundles(addBasePath: (path: string) => string) {
    // Load all bundles in parallel
    return Promise.all([...this.plugins.values()].map(plugin => plugin.load(addBasePath)));
  }
}
