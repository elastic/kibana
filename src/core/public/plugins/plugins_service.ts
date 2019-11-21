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

import { PluginName, PluginOpaqueId } from '../../server';
import { CoreService } from '../../types';
import { CoreContext } from '../core_system';
import { PluginWrapper } from './plugin';
import {
  createPluginInitializerContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';
import { InternalCoreSetup, InternalCoreStart } from '../core_system';
import { InjectedPluginMetadata } from '../injected_metadata';

/** @internal */
export type PluginsServiceSetupDeps = InternalCoreSetup;
/** @internal */
export type PluginsServiceStartDeps = InternalCoreStart;

/** @internal */
export interface PluginsServiceSetup {
  contracts: ReadonlyMap<string, unknown>;
}
/** @internal */
export interface PluginsServiceStart {
  contracts: ReadonlyMap<string, unknown>;
}

/**
 * Service responsible for loading plugin bundles, initializing plugins, and managing the lifecycle
 * of all plugins.
 *
 * @internal
 */
export class PluginsService implements CoreService<PluginsServiceSetup, PluginsServiceStart> {
  /** Plugin wrappers in topological order. */
  private readonly plugins = new Map<PluginName, PluginWrapper<unknown, Record<string, unknown>>>();
  private readonly pluginDependencies = new Map<PluginName, PluginName[]>();

  private readonly satupPlugins: PluginName[] = [];

  constructor(private readonly coreContext: CoreContext, plugins: InjectedPluginMetadata[]) {
    // Generate opaque ids
    const opaqueIds = new Map<PluginName, PluginOpaqueId>(plugins.map(p => [p.id, Symbol(p.id)]));

    // Setup dependency map and plugin wrappers
    plugins.forEach(({ id, plugin, config = {} }) => {
      // Setup map of dependencies
      this.pluginDependencies.set(id, [
        ...plugin.requiredPlugins,
        ...plugin.optionalPlugins.filter(optPlugin => opaqueIds.has(optPlugin)),
      ]);

      // Construct plugin wrappers, depending on the topological order set by the server.
      this.plugins.set(
        id,
        new PluginWrapper(
          plugin,
          opaqueIds.get(id)!,
          createPluginInitializerContext(this.coreContext, opaqueIds.get(id)!, plugin, config)
        )
      );
    });
  }

  public getOpaqueIds(): ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]> {
    // Return dependency map of opaque ids
    return new Map(
      [...this.pluginDependencies].map(([id, deps]) => [
        this.plugins.get(id)!.opaqueId,
        deps.map(depId => this.plugins.get(depId)!.opaqueId),
      ])
    );
  }

  public async setup(deps: PluginsServiceSetupDeps): Promise<PluginsServiceSetup> {
    // Load plugin bundles
    await this.loadPluginBundles(deps.http.basePath.prepend);

    // Setup each plugin with required and optional plugin contracts
    const contracts = new Map<string, unknown>();
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const pluginDepContracts = [...this.pluginDependencies.get(pluginName)!].reduce(
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

  public async start(deps: PluginsServiceStartDeps): Promise<PluginsServiceStart> {
    // Setup each plugin with required and optional plugin contracts
    const contracts = new Map<string, unknown>();
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const pluginDepContracts = [...this.pluginDependencies.get(pluginName)!].reduce(
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
