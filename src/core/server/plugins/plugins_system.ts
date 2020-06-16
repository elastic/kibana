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

import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { PluginWrapper } from './plugin';
import { DiscoveredPlugin, PluginName, PluginOpaqueId } from './types';
import { createPluginSetupContext, createPluginStartContext } from './plugin_context';
import { PluginsServiceSetupDeps, PluginsServiceStartDeps } from './plugins_service';
import { withTimeout } from '../../utils';

const Sec = 1000;
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

  /**
   * @returns a ReadonlyMap of each plugin and an Array of its available dependencies
   * @internal
   */
  public getPluginDependencies(): ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]> {
    // Return dependency map of opaque ids
    return new Map(
      [...this.plugins].map(([name, plugin]) => [
        plugin.opaqueId,
        [
          ...new Set([
            ...plugin.requiredPlugins,
            ...plugin.optionalPlugins.filter((optPlugin) => this.plugins.has(optPlugin)),
          ]),
        ].map((depId) => this.plugins.get(depId)!.opaqueId),
      ])
    );
  }

  public async setupPlugins(deps: PluginsServiceSetupDeps) {
    const contracts = new Map<PluginName, unknown>();
    if (this.plugins.size === 0) {
      return contracts;
    }

    const sortedPlugins = new Map(
      [...this.getTopologicallySortedPluginNames()]
        .map((pluginName) => [pluginName, this.plugins.get(pluginName)!] as [string, PluginWrapper])
        .filter(([pluginName, plugin]) => plugin.includesServerPlugin)
    );
    this.log.info(
      `Setting up [${sortedPlugins.size}] plugins: [${[...sortedPlugins.keys()].join(',')}]`
    );

    for (const [pluginName, plugin] of sortedPlugins) {
      this.log.debug(`Setting up plugin "${pluginName}"...`);
      const pluginDeps = new Set([...plugin.requiredPlugins, ...plugin.optionalPlugins]);
      const pluginDepContracts = Array.from(pluginDeps).reduce((depContracts, dependencyName) => {
        // Only set if present. Could be absent if plugin does not have server-side code or is a
        // missing optional dependency.
        if (contracts.has(dependencyName)) {
          depContracts[dependencyName] = contracts.get(dependencyName);
        }

        return depContracts;
      }, {} as Record<PluginName, unknown>);

      const contract = await withTimeout({
        promise: plugin.setup(
          createPluginSetupContext(this.coreContext, deps, plugin),
          pluginDepContracts
        ),
        timeout: 30 * Sec,
        errorMessage: `Setup lifecycle of "${pluginName}" plugin wasn't completed in 30sec. Consider disabling the plugin and re-start.`,
      });

      contracts.set(pluginName, contract);
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
      const pluginDepContracts = Array.from(pluginDeps).reduce((depContracts, dependencyName) => {
        // Only set if present. Could be absent if plugin does not have server-side code or is a
        // missing optional dependency.
        if (contracts.has(dependencyName)) {
          depContracts[dependencyName] = contracts.get(dependencyName);
        }

        return depContracts;
      }, {} as Record<PluginName, unknown>);

      const contract = await withTimeout({
        promise: plugin.start(
          createPluginStartContext(this.coreContext, deps, plugin),
          pluginDepContracts
        ),
        timeout: 30 * Sec,
        errorMessage: `Start lifecycle of "${pluginName}" plugin wasn't completed in 30sec. Consider disabling the plugin and re-start.`,
      });

      contracts.set(pluginName, contract);
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
    const uiPluginNames = [...this.getTopologicallySortedPluginNames().keys()].filter(
      (pluginName) => this.plugins.get(pluginName)!.includesUiPlugin
    );
    const publicPlugins = new Map<PluginName, DiscoveredPlugin>(
      uiPluginNames.map((pluginName) => {
        const plugin = this.plugins.get(pluginName)!;
        return [
          pluginName,
          {
            id: pluginName,
            configPath: plugin.manifest.configPath,
            requiredPlugins: plugin.manifest.requiredPlugins.filter((p) =>
              uiPluginNames.includes(p)
            ),
            optionalPlugins: plugin.manifest.optionalPlugins.filter((p) =>
              uiPluginNames.includes(p)
            ),
          },
        ];
      })
    );

    return publicPlugins;
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
            ...plugin.optionalPlugins.filter((dependency) => this.plugins.has(dependency)),
          ]),
        ] as [PluginName, Set<PluginName>];
      })
    );

    // First, find a list of "start nodes" which have no outgoing edges. At least
    // one such node must exist in a non-empty acyclic graph.
    const pluginsWithAllDependenciesSorted = [...pluginsDependenciesGraph.keys()].filter(
      (pluginName) => pluginsDependenciesGraph.get(pluginName)!.size === 0
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
      const edgesLeft = JSON.stringify([...pluginsDependenciesGraph.keys()]);
      throw new Error(
        `Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ${edgesLeft}`
      );
    }

    return sortedPluginNames;
  }
}
