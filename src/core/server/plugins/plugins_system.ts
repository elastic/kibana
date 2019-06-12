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

import { pick } from 'lodash';

import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { DiscoveredPlugin, DiscoveredPluginInternal, PluginWrapper, PluginName } from './plugin';
import { createPluginSetupContext, createPluginStartContext } from './plugin_context';
import { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';

/** @internal */
export class PluginsSystem {
  private readonly plugins = new Map<PluginName, PluginWrapper>();
  private readonly log: Logger;
  // `satup`, the past-tense version of the noun `setup`.
  private readonly satupPlugins: PluginName[] = [];

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('plugins-system');
  }

  public addPlugin(plugin: PluginWrapper) {
    this.plugins.set(plugin.name, plugin);
  }

  public async setupPlugins(deps: PluginsServiceSetupDeps) {
    const contracts = new Map<PluginName, unknown>();
    if (this.plugins.size === 0) {
      return contracts;
    }

    const sortedPlugins = this.getTopologicallySortedPluginNames();
    this.log.info(`Setting up [${this.plugins.size}] plugins: [${[...sortedPlugins]}]`);

    for (const pluginName of sortedPlugins) {
      const plugin = this.plugins.get(pluginName)!;
      if (!plugin.includesServerPlugin) {
        continue;
      }

      this.log.debug(`Setting up plugin "${pluginName}"...`);
      const pluginDeps = new Set([...plugin.requiredPlugins, ...plugin.optionalPlugins]);
      const pluginDepContracts = Array.from(pluginDeps).reduce(
        (depContracts, dependencyName) => {
          // Only set if present. Could be absent if plugin does not have server-side code or is a
          // missing optional dependency.
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

    return contracts;
  }

  public async startPlugins(deps: PluginsServiceStartDeps) {
    const contracts = new Map<PluginName, unknown>();
    if (this.satupPlugins.length === 0) {
      return contracts;
    }

    this.log.info(`Starting [${this.satupPlugins.length}] plugins: [${[...this.satupPlugins]}]`);

    for (const pluginName of this.satupPlugins) {
      this.log.debug(`Starting plugin "${pluginName}"...`);
      const plugin = this.plugins.get(pluginName)!;
      const pluginDeps = new Set([...plugin.requiredPlugins, ...plugin.optionalPlugins]);
      const pluginDepContracts = Array.from(pluginDeps).reduce(
        (depContracts, dependencyName) => {
          // Only set if present. Could be absent if plugin does not have server-side code or is a
          // missing optional dependency.
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

    return contracts;
  }

  public async stopPlugins() {
    if (this.plugins.size === 0 || this.satupPlugins.length === 0) {
      return;
    }

    this.log.info(`Stopping all plugins.`);

    // Stop plugins in the reverse order of when they were set up.
    while (this.satupPlugins.length > 0) {
      const pluginName = this.satupPlugins.pop()!;

      this.log.debug(`Stopping plugin "${pluginName}"...`);
      await this.plugins.get(pluginName)!.stop();
    }
  }

  /**
   * Get a Map of all discovered UI plugins in topological order.
   */
  public uiPlugins() {
    const internal = new Map<PluginName, DiscoveredPluginInternal>(
      [...this.getTopologicallySortedPluginNames().keys()]
        .filter(pluginName => this.plugins.get(pluginName)!.includesUiPlugin)
        .map(pluginName => {
          const plugin = this.plugins.get(pluginName)!;
          return [
            pluginName,
            {
              id: pluginName,
              path: plugin.path,
              configPath: plugin.manifest.configPath,
              requiredPlugins: plugin.manifest.requiredPlugins,
              optionalPlugins: plugin.manifest.optionalPlugins,
            },
          ] as [PluginName, DiscoveredPluginInternal];
        })
    );

    const publicPlugins = new Map<PluginName, DiscoveredPlugin>(
      [...internal.entries()].map(
        ([pluginName, plugin]) =>
          [
            pluginName,
            pick(plugin, ['id', 'configPath', 'requiredPlugins', 'optionalPlugins']),
          ] as [PluginName, DiscoveredPlugin]
      )
    );

    return { public: publicPlugins, internal };
  }

  /**
   * Gets topologically sorted plugin names that are registered with the plugin system.
   * Ordering is possible if and only if the plugins graph has no directed cycles,
   * that is, if it is a directed acyclic graph (DAG). If plugins cannot be ordered
   * an error is thrown.
   *
   * Uses Kahn's Algorithm to sort the graph.
   */
  private getTopologicallySortedPluginNames() {
    // We clone plugins so we can remove handled nodes while we perform the
    // topological ordering. If the cloned graph is _not_ empty at the end, we
    // know we were not able to topologically order the graph. We exclude optional
    // dependencies that are not present in the plugins graph.
    const pluginsDependenciesGraph = new Map(
      [...this.plugins.entries()].map(([pluginName, plugin]) => {
        return [
          pluginName,
          new Set([
            ...plugin.requiredPlugins,
            ...plugin.optionalPlugins.filter(dependency => this.plugins.has(dependency)),
          ]),
        ] as [PluginName, Set<PluginName>];
      })
    );

    // First, find a list of "start nodes" which have no outgoing edges. At least
    // one such node must exist in a non-empty acyclic graph.
    const pluginsWithAllDependenciesSorted = [...pluginsDependenciesGraph.keys()].filter(
      pluginName => pluginsDependenciesGraph.get(pluginName)!.size === 0
    );

    const sortedPluginNames = new Set<PluginName>();
    while (pluginsWithAllDependenciesSorted.length > 0) {
      const sortedPluginName = pluginsWithAllDependenciesSorted.pop()!;

      // We know this plugin has all its dependencies sorted, so we can remove it
      // and include into the final result.
      pluginsDependenciesGraph.delete(sortedPluginName);
      sortedPluginNames.add(sortedPluginName);

      // Go through the rest of the plugins and remove `sortedPluginName` from their
      // unsorted dependencies.
      for (const [pluginName, dependencies] of pluginsDependenciesGraph) {
        // If we managed delete `sortedPluginName` from dependencies let's check
        // whether it was the last one and we can mark plugin as sorted.
        if (dependencies.delete(sortedPluginName) && dependencies.size === 0) {
          pluginsWithAllDependenciesSorted.push(pluginName);
        }
      }
    }

    if (pluginsDependenciesGraph.size > 0) {
      const edgesLeft = JSON.stringify([...pluginsDependenciesGraph.entries()]);
      throw new Error(
        `Topological ordering of plugins did not complete, these edges could not be ordered: ${edgesLeft}`
      );
    }

    return sortedPluginNames;
  }
}
