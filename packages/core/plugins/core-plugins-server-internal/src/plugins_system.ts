/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withTimeout, isPromise } from '@kbn/std';
import type { DiscoveredPlugin, PluginName } from '@kbn/core-base-common';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import { PluginType } from '@kbn/core-base-common';
import type { PluginWrapper } from './plugin';
import { type PluginDependencies } from './types';
import {
  createPluginPrebootSetupContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';
import type {
  PluginsServicePrebootSetupDeps,
  PluginsServiceSetupDeps,
  PluginsServiceStartDeps,
} from './plugins_service';
import { RuntimePluginContractResolver } from './plugin_contract_resolver';

const Sec = 1000;

/** @internal */
export class PluginsSystem<T extends PluginType> {
  private readonly runtimeResolver = new RuntimePluginContractResolver();
  private readonly plugins = new Map<PluginName, PluginWrapper>();
  private readonly log: Logger;
  // `satup`, the past-tense version of the noun `setup`.
  private readonly satupPlugins: PluginName[] = [];
  private sortedPluginNames?: Set<string>;

  constructor(private readonly coreContext: CoreContext, public readonly type: T) {
    this.log = coreContext.logger.get('plugins-system', this.type);
  }

  public addPlugin(plugin: PluginWrapper) {
    if (plugin.manifest.type !== this.type) {
      throw new Error(
        `Cannot add plugin with type "${plugin.manifest.type}" to plugin system with type "${this.type}".`
      );
    }

    this.plugins.set(plugin.name, plugin);

    // clear sorted plugin name cache on addition
    this.sortedPluginNames = undefined;
  }

  public getPlugins() {
    return [...this.plugins.values()];
  }

  /**
   * @returns a Map of each plugin and an Array of its available dependencies
   * @internal
   */
  public getPluginDependencies(): PluginDependencies {
    const asNames = new Map<string, string[]>();
    const asOpaqueIds = new Map<symbol, symbol[]>();

    for (const pluginName of this.getTopologicallySortedPluginNames()) {
      const plugin = this.plugins.get(pluginName)!;
      const dependencies = [
        ...new Set([
          ...plugin.requiredPlugins,
          ...plugin.optionalPlugins.filter((optPlugin) => this.plugins.has(optPlugin)),
        ]),
      ];

      asNames.set(
        plugin.name,
        dependencies.map((depId) => this.plugins.get(depId)!.name)
      );
      asOpaqueIds.set(
        plugin.opaqueId,
        dependencies.map((depId) => this.plugins.get(depId)!.opaqueId)
      );
    }

    return { asNames, asOpaqueIds };
  }

  public async setupPlugins(
    deps: T extends PluginType.preboot ? PluginsServicePrebootSetupDeps : PluginsServiceSetupDeps
  ): Promise<Map<string, unknown>> {
    const contracts = new Map<PluginName, unknown>();
    if (this.plugins.size === 0) {
      return contracts;
    }

    const runtimeDependencies = buildPluginRuntimeDependencyMap(this.plugins);
    this.runtimeResolver.setDependencyMap(runtimeDependencies);

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

      let pluginSetupContext;
      if (this.type === PluginType.preboot) {
        pluginSetupContext = createPluginPrebootSetupContext({
          deps: deps as PluginsServicePrebootSetupDeps,
          plugin,
        });
      } else {
        pluginSetupContext = createPluginSetupContext({
          deps: deps as PluginsServiceSetupDeps,
          plugin,
          runtimeResolver: this.runtimeResolver,
        });
      }

      await plugin.init();
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
      this.satupPlugins.push(pluginName);
    }

    this.runtimeResolver.resolveSetupRequests(contracts);

    return contracts;
  }

  public async startPlugins(deps: PluginsServiceStartDeps) {
    if (this.type === PluginType.preboot) {
      throw new Error('Preboot plugins cannot be started.');
    }

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

      let contract: unknown;
      const contractOrPromise = plugin.start(
        createPluginStartContext({ deps, plugin, runtimeResolver: this.runtimeResolver }),
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

    this.runtimeResolver.resolveStartRequests(contracts);

    return contracts;
  }

  public async stopPlugins() {
    if (this.plugins.size === 0 || this.satupPlugins.length === 0) {
      return;
    }

    this.log.info(`Stopping all plugins.`);

    const reverseDependencyMap = buildReverseDependencyMap(this.plugins);
    const pluginStopPromiseMap = new Map<PluginName, Promise<void>>();
    for (let i = this.satupPlugins.length - 1; i > -1; i--) {
      const pluginName = this.satupPlugins[i];
      const plugin = this.plugins.get(pluginName)!;
      const pluginDependant = reverseDependencyMap.get(pluginName)!;
      const dependantPromises = pluginDependant.map(
        (dependantName) => pluginStopPromiseMap.get(dependantName)!
      );

      // Stop plugin as soon as all the dependant plugins are stopped.
      const pluginStopPromise = Promise.all(dependantPromises).then(async () => {
        this.log.debug(`Stopping plugin "${pluginName}"...`);

        try {
          const resultMaybe = await withTimeout({
            promise: plugin.stop(),
            timeoutMs: 15 * Sec,
          });
          if (resultMaybe?.timedout) {
            this.log.warn(`"${pluginName}" plugin didn't stop in 15sec., move on to the next.`);
          }
        } catch (e) {
          this.log.warn(`"${pluginName}" thrown during stop: ${e}`);
        }
      });
      pluginStopPromiseMap.set(pluginName, pluginStopPromise);
    }

    await Promise.allSettled(pluginStopPromiseMap.values());

    this.log.info(`All plugins stopped.`);
  }

  /**
   * Get a Map of all discovered UI plugins in topological order.
   */
  public uiPlugins() {
    const uiPluginNames = [...this.getTopologicallySortedPluginNames().keys()].filter(
      (pluginName) => this.plugins.get(pluginName)!.includesUiPlugin
    );
    const filterUiPlugins = (pluginName: string) => uiPluginNames.includes(pluginName);
    const publicPlugins = new Map<PluginName, DiscoveredPlugin>(
      uiPluginNames.map((pluginName) => {
        const plugin = this.plugins.get(pluginName)!;
        return [
          pluginName,
          {
            id: pluginName,
            type: plugin.manifest.type,
            configPath: plugin.manifest.configPath,
            requiredPlugins: plugin.manifest.requiredPlugins.filter(filterUiPlugins),
            optionalPlugins: plugin.manifest.optionalPlugins.filter(filterUiPlugins),
            runtimePluginDependencies:
              plugin.manifest.runtimePluginDependencies.filter(filterUiPlugins),
            requiredBundles: plugin.manifest.requiredBundles,
            enabledOnAnonymousPages: plugin.manifest.enabledOnAnonymousPages,
          },
        ];
      })
    );

    return publicPlugins;
  }

  private getTopologicallySortedPluginNames() {
    if (!this.sortedPluginNames) {
      this.sortedPluginNames = getTopologicallySortedPluginNames(this.plugins);
    }
    return this.sortedPluginNames;
  }
}

/**
 * Gets topologically sorted plugin names that are registered with the plugin system.
 * Ordering is possible if and only if the plugins graph has no directed cycles,
 * that is, if it is a directed acyclic graph (DAG). If plugins cannot be ordered
 * an error is thrown.
 *
 * Uses Kahn's Algorithm to sort the graph.
 */
const getTopologicallySortedPluginNames = (plugins: Map<PluginName, PluginWrapper>) => {
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
};

const buildReverseDependencyMap = (
  pluginMap: Map<PluginName, PluginWrapper>
): Map<PluginName, PluginName[]> => {
  const reverseMap = new Map<PluginName, PluginName[]>();
  for (const pluginName of pluginMap.keys()) {
    reverseMap.set(pluginName, []);
  }
  for (const [pluginName, pluginWrapper] of pluginMap.entries()) {
    const allDependencies = [...pluginWrapper.requiredPlugins, ...pluginWrapper.optionalPlugins];
    for (const dependency of allDependencies) {
      // necessary to evict non-present optional dependency
      if (pluginMap.has(dependency)) {
        reverseMap.get(dependency)!.push(pluginName);
      }
    }
    reverseMap.set(pluginName, []);
  }
  return reverseMap;
};

const buildPluginRuntimeDependencyMap = (
  pluginMap: Map<PluginName, PluginWrapper>
): Map<PluginName, Set<PluginName>> => {
  const runtimeDependencies = new Map<PluginName, Set<PluginName>>();
  for (const [pluginName, pluginWrapper] of pluginMap.entries()) {
    const pluginRuntimeDeps = new Set([
      ...pluginWrapper.optionalPlugins,
      ...pluginWrapper.requiredPlugins,
      ...pluginWrapper.runtimePluginDependencies,
    ]);
    runtimeDependencies.set(pluginName, pluginRuntimeDeps);
  }
  return runtimeDependencies;
};
