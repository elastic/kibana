/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { withTimeout, isPromise } from '@kbn/std';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { PluginWrapper } from './plugin';
import { DiscoveredPlugin, PluginDependencies, PluginName, PluginType } from './types';
import {
  createPluginPrebootSetupContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';
import {
  PluginsServicePrebootSetupDeps,
  PluginsServiceSetupDeps,
  PluginsServiceStartDeps,
} from './plugins_service';

const Sec = 1000;

/** @internal */
export class PluginsSystem {
  private readonly prebootPlugins = new Map<PluginName, PluginWrapper>();
  private readonly standardPlugins = new Map<PluginName, PluginWrapper>();
  private readonly log: Logger;
  // `satup`, the past-tense version of the noun `setup`.
  private readonly satupPrebootPlugins: PluginName[] = [];
  private readonly satupStandardPlugins: PluginName[] = [];

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('plugins-system');
  }

  public addPlugin(plugin: PluginWrapper) {
    if (plugin.manifest.type === PluginType.preboot) {
      this.prebootPlugins.set(plugin.name, plugin);
    } else {
      this.standardPlugins.set(plugin.name, plugin);
    }
  }

  public getPlugins(type: PluginType) {
    return [...(type === PluginType.preboot ? this.prebootPlugins : this.standardPlugins).values()];
  }

  /**
   * @returns a ReadonlyMap of each plugin and an Array of its available dependencies
   * @internal
   */
  public getPluginDependencies(type: PluginType): PluginDependencies {
    const plugins = type === PluginType.preboot ? this.prebootPlugins : this.standardPlugins;
    const asNames = new Map();
    const asOpaqueIds = new Map();
    for (const plugin of plugins.values()) {
      const dependencies = [
        ...new Set([
          ...plugin.requiredPlugins,
          ...plugin.optionalPlugins.filter((optPlugin) => plugins.has(optPlugin)),
        ]),
      ];

      asNames.set(
        plugin.name,
        dependencies.map((pluginName) => plugins.get(pluginName)!.name)
      );
      asOpaqueIds.set(
        plugin.opaqueId,
        dependencies.map((pluginName) => plugins.get(pluginName)!.opaqueId)
      );
    }

    return { asNames, asOpaqueIds };
  }

  public async setupPlugins(
    type: PluginType.preboot,
    deps: PluginsServicePrebootSetupDeps
  ): Promise<Map<string, unknown>>;
  public async setupPlugins(
    type: PluginType.standard,
    deps: PluginsServiceSetupDeps
  ): Promise<Map<string, unknown>>;
  async setupPlugins(
    type: PluginType,
    deps: PluginsServicePrebootSetupDeps | PluginsServiceSetupDeps
  ): Promise<Map<string, unknown>> {
    const [plugins, satupPlugins] =
      type === PluginType.preboot
        ? [this.prebootPlugins, this.satupPrebootPlugins]
        : [this.standardPlugins, this.satupStandardPlugins];

    const contracts = new Map<PluginName, unknown>();
    if (plugins.size === 0) {
      return contracts;
    }

    const sortedPlugins = new Map(
      [...this.getTopologicallySortedPluginNames(plugins)]
        .map((pluginName) => [pluginName, plugins.get(pluginName)!] as [string, PluginWrapper])
        .filter(([, plugin]) => plugin.includesServerPlugin)
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

      let pluginSetupContext;
      if (type === PluginType.preboot) {
        pluginSetupContext = createPluginPrebootSetupContext(
          this.coreContext,
          deps as PluginsServicePrebootSetupDeps,
          plugin
        );
      } else {
        pluginSetupContext = createPluginSetupContext(
          this.coreContext,
          deps as PluginsServiceSetupDeps,
          plugin
        );
      }

      let contract: unknown;
      const contractOrPromise = plugin.setup(pluginSetupContext, pluginDepContracts);
      if (isPromise(contractOrPromise)) {
        if (this.coreContext.env.mode.dev) {
          this.log.warn(
            `Plugin ${pluginName} is using asynchronous setup lifecycle. Asynchronous plugins support will be removed in a later version.`
          );
        }
        const contractMaybe = await withTimeout<any>({
          promise: contractOrPromise,
          timeoutMs: 10 * Sec,
        });

        if (contractMaybe.timedout) {
          throw new Error(
            `Setup lifecycle of "${pluginName}" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.`
          );
        } else {
          contract = contractMaybe.value;
        }
      } else {
        contract = contractOrPromise;
      }

      contracts.set(pluginName, contract);
      satupPlugins.push(pluginName);
    }

    return contracts;
  }

  public async startPlugins(type: PluginType.standard, deps: PluginsServiceStartDeps) {
    const contracts = new Map<PluginName, unknown>();
    if (this.satupStandardPlugins.length === 0) {
      return contracts;
    }

    this.log.info(
      `Starting [${this.satupStandardPlugins.length}] plugins: [${[...this.satupStandardPlugins]}]`
    );

    for (const pluginName of this.satupStandardPlugins) {
      this.log.debug(`Starting plugin "${pluginName}"...`);
      const plugin = this.standardPlugins.get(pluginName)!;
      const pluginDeps = new Set([...plugin.requiredPlugins, ...plugin.optionalPlugins]);
      const pluginDepContracts = Array.from(pluginDeps).reduce((depContracts, dependencyName) => {
        // Only set if present. Could be absent if plugin does not have server-side code or is a
        // missing optional dependency.
        if (contracts.has(dependencyName)) {
          depContracts[dependencyName] = contracts.get(dependencyName);
        }

        return depContracts;
      }, {} as Record<PluginName, unknown>);

      let contract: unknown;
      const contractOrPromise = plugin.start(
        createPluginStartContext(this.coreContext, deps, plugin),
        pluginDepContracts
      );
      if (isPromise(contractOrPromise)) {
        if (this.coreContext.env.mode.dev) {
          this.log.warn(
            `Plugin ${pluginName} is using asynchronous start lifecycle. Asynchronous plugins support will be removed in a later version.`
          );
        }
        const contractMaybe = await withTimeout({
          promise: contractOrPromise,
          timeoutMs: 10 * Sec,
        });

        if (contractMaybe.timedout) {
          throw new Error(
            `Start lifecycle of "${pluginName}" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.`
          );
        } else {
          contract = contractMaybe.value;
        }
      } else {
        contract = contractOrPromise;
      }

      contracts.set(pluginName, contract);
    }

    return contracts;
  }

  public async stopPlugins(type: PluginType) {
    const [plugins, satupPlugins] =
      type === PluginType.preboot
        ? [this.prebootPlugins, this.satupPrebootPlugins]
        : [this.standardPlugins, this.satupStandardPlugins];

    if (plugins.size === 0 || satupPlugins.length === 0) {
      return;
    }

    this.log.info(`Stopping all "${type}" plugins.`);

    // Stop plugins in the reverse order of when they were set up.
    while (satupPlugins.length > 0) {
      const pluginName = satupPlugins.pop()!;

      this.log.debug(`Stopping plugin "${pluginName}"...`);

      const resultMaybe = await withTimeout({
        promise: plugins.get(pluginName)!.stop(),
        timeoutMs: 30 * Sec,
      });

      if (resultMaybe?.timedout) {
        this.log.warn(`"${pluginName}" plugin didn't stop in 30sec., move on to the next.`);
      }
    }
  }

  /**
   * Get a Map of all discovered UI plugins in topological order.
   */
  public uiPlugins(type: PluginType) {
    const plugins = type === PluginType.preboot ? this.prebootPlugins : this.standardPlugins;
    const uiPluginNames = [...this.getTopologicallySortedPluginNames(plugins).keys()].filter(
      (pluginName) => plugins.get(pluginName)!.includesUiPlugin
    );
    const publicPlugins = new Map<PluginName, DiscoveredPlugin>(
      uiPluginNames.map((pluginName) => {
        const plugin = plugins.get(pluginName)!;
        return [
          pluginName,
          {
            id: pluginName,
            type: plugin.manifest.type,
            configPath: plugin.manifest.configPath,
            requiredPlugins: plugin.manifest.requiredPlugins.filter((p) =>
              uiPluginNames.includes(p)
            ),
            optionalPlugins: plugin.manifest.optionalPlugins.filter((p) =>
              uiPluginNames.includes(p)
            ),
            requiredBundles: plugin.manifest.requiredBundles,
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
  private getTopologicallySortedPluginNames(plugins: Map<PluginName, PluginWrapper>) {
    // We clone plugins so we can remove handled nodes while we perform the
    // topological ordering. If the cloned graph is _not_ empty at the end, we
    // know we were not able to topologically order the graph. We exclude optional
    // dependencies that are not present in the plugins graph.
    const pluginsDependenciesGraph = new Map(
      [...plugins.entries()].map(([pluginName, plugin]) => {
        return [
          pluginName,
          new Set([
            ...plugin.requiredPlugins,
            ...plugin.optionalPlugins.filter((dependency) => plugins.has(dependency)),
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
