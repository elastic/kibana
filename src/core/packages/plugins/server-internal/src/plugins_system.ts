/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map } from 'rxjs';
import { withTimeout, isPromise } from '@kbn/std';
import type { DiscoveredPlugin, PluginName } from '@kbn/core-base-common';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import { PluginType } from '@kbn/core-base-common';
import type { NodeRoles } from '@kbn/core-node-server';
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
import { type DeferredInitEngine, toServiceStatus } from './deferred_init';

const Sec = 1000;
/** A `start()` slower than this is doing work that belongs in `initialize()`. */
const SLOW_START_WARNING_MS = 1 * Sec;

/** @internal */
export class PluginsSystem<T extends PluginType> {
  private readonly runtimeResolver: RuntimePluginContractResolver;
  private readonly plugins = new Map<PluginName, PluginWrapper>();
  private readonly log: Logger;
  // `satup`, the past-tense version of the noun `setup`.
  private readonly satupPlugins: PluginName[] = [];
  private sortedPluginNames?: Set<string>;
  private nodeRoles?: NodeRoles;
  private initializeOnBoot = true;

  constructor(
    private readonly coreContext: CoreContext,
    public readonly type: T,
    private readonly deferredInitEngine?: DeferredInitEngine
  ) {
    this.log = coreContext.logger.get('plugins-system', this.type);
    this.runtimeResolver = new RuntimePluginContractResolver();
  }

  /**
   * Records this node's roles. A node without the `ui` role never receives the requests that
   * would initialize its plugins on first use, so {@link startPlugins} runs their `initialize()`
   * itself once boot is done.
   */
  public setNodeRoles(roles: NodeRoles): void {
    this.nodeRoles = roles;
  }

  /**
   * Whether {@link startPlugins} runs every plugin's `initialize()` as soon as the start loop is
   * over (the default), or leaves each one to the first request or call that needs it.
   */
  public setInitializeOnBoot(value: boolean): void {
    this.initializeOnBoot = value;
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

    assertInitializationIsServerSide(this.plugins);

    const runtimeDependencies = buildPluginRuntimeDependencyMap(this.plugins);
    this.runtimeResolver.setDependencyMap(runtimeDependencies);
    const engine = this.deferredInitEngine;
    if (engine) {
      this.runtimeResolver.setDeferredInitEngine(engine);
    }

    const sortedPlugins = new Map(
      [...this.getTopologicallySortedPluginNames()]
        .map((pluginName) => [pluginName, this.plugins.get(pluginName)!] as [string, PluginWrapper])
        .filter(([pluginName, plugin]) => plugin.includesServerPlugin)
    );
    this.log.info(
      `Setting up [${sortedPlugins.size}] plugins: [${[...sortedPlugins.keys()].join(',')}]`
    );

    // Awaiting a plugin's initialization from inside `setup()` would hold boot on deliberately
    // expensive work, so the engine rejects it while this loop runs. Cleared in `finally` so a
    // thrown `setup()` cannot leave the guard stuck for post-boot callers.
    engine?.beginLifecycle('setup');
    try {
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
            deferredInitEngine: this.deferredInitEngine,
          });
        }

        await plugin.init();

        if (engine && plugin.hasInitialization) {
          engine.register(pluginName);
          // Core mirrors the plugin's initialization state into its `/status` entry, so the plugin
          // author writes no status code. Read-only: `status$` never starts an attempt.
          (deps as PluginsServiceSetupDeps).status.plugins.set(
            pluginName,
            engine.status$(pluginName).pipe(map((status) => toServiceStatus(pluginName, status)))
          );
          this.log.info(
            `Plugin "${pluginName}" has an initialize() hook; its routes and apps are served once it has run.`
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
        this.satupPlugins.push(pluginName);
      }
    } finally {
      engine?.endLifecycle();
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

    const engine = this.deferredInitEngine;
    const toInitialize: PluginName[] = [];
    // Awaiting a plugin's initialization from inside `start()` would hold boot on deliberately
    // expensive work, so the engine rejects it while this loop runs. Cleared in `finally` so a
    // thrown `start()` cannot leave the guard stuck for post-boot callers.
    engine?.beginLifecycle('start');
    try {
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
        const startContext = createPluginStartContext({
          deps,
          plugin,
          runtimeResolver: this.runtimeResolver,
        });

        // `initialize()` receives exactly what `start()` receives; the engine decides when it runs.
        if (engine && plugin.hasInitialization) {
          engine.setRunner(pluginName, () =>
            plugin.runInitialize(startContext, pluginDepContracts)
          );
        }

        let contract: unknown;
        const startedAt = performance.now();
        const contractOrPromise = plugin.start(startContext, pluginDepContracts);
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
        const startDurationMs = performance.now() - startedAt;
        if (startDurationMs > SLOW_START_WARNING_MS) {
          this.log.warn(
            `Start lifecycle of "${pluginName}" plugin took ${Math.round(
              startDurationMs
            )}ms, which exceeds 1s. Move initialization work (index setup, data loading, Elasticsearch calls) into the plugin's initialize() hook so start() returns immediately.`
          );
        }

        contracts.set(pluginName, contract);
        if (engine) {
          if (plugin.hasInitialization) {
            toInitialize.push(pluginName);
          } else {
            engine.markAvailable(pluginName);
          }
        }
      }
    } finally {
      engine?.endLifecycle();
    }

    this.runtimeResolver.resolveStartRequests(contracts);

    // Only once the loop is over: an `initialize()` body may await a dependency's initialization,
    // which the lifecycle guard rejects while the start loop is active.
    if (engine && this.initializeOnBoot) {
      this.initializePlugins(engine, toInitialize);
    } else if (engine) {
      this.initializePluginsOnHeadlessNode(engine, toInitialize);
    }

    return contracts;
  }

  /** Runs `initialize()` for the given plugins in start order, without waiting for any of them. */
  private initializePlugins(engine: DeferredInitEngine, pluginNames: PluginName[]): void {
    if (pluginNames.length === 0) {
      return;
    }
    this.log.info(
      `Running initialize() for ${pluginNames.length} plugin(s) now that all plugins have started.`
    );
    for (const pluginName of pluginNames) {
      engine.ensureInitialized(pluginName);
    }
  }

  /**
   * A node without the `ui` role serves no pages and no UI-driven API calls, so no request would
   * ever initialize its plugins and their background tasks would be claimed and skipped forever.
   * There is nothing worth waiting for on such a node, so run every `initialize()` now that boot
   * is done. Non-blocking: the attempts run concurrently with the rest of core's start.
   */
  private initializePluginsOnHeadlessNode(
    engine: DeferredInitEngine,
    pluginNames: PluginName[]
  ): void {
    if (this.nodeRoles === undefined || this.nodeRoles.ui || pluginNames.length === 0) {
      return;
    }
    this.log.info(
      `This node has no "ui" role, so no request can initialize its plugins; running initialize() for [${pluginNames.join(
        ','
      )}] now.`
    );
    for (const pluginName of pluginNames) {
      engine.ensureInitialized(pluginName);
    }
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
            runtimePluginDependencies: plugin.manifest.runtimePluginDependencies,
            requiredBundles: plugin.manifest.requiredBundles,
            enabledOnAnonymousPages: plugin.manifest.enabledOnAnonymousPages,
            hasInitialization: plugin.manifest.hasInitialization,
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
    // Identify circular dependencies
    let cyclePaths: string[] = [];

    try {
      const circularDependencies = findCircularDependencies(pluginsDependenciesGraph);

      cyclePaths = circularDependencies.map((cycle) => `\n  ${cycle.join(' -> ')} -> ${cycle[0]}`);
    } catch (e) {
      cyclePaths = [];
    }

    const edgesLeft = JSON.stringify([...pluginsDependenciesGraph.keys()]);

    throw new Error(
      `Topological ordering of plugins did not complete due to circular dependencies:` +
        `${
          cyclePaths.length > 0 ? `\n\nDetected circular dependencies:${cyclePaths.join('')}` : ''
        }` +
        `\n\nPlugins with cyclic or missing dependencies: ${edgesLeft}`
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

/**
 * Rejects a plugin that declares `initialize()` without a server entry: `initialize()` is a
 * server-side lifecycle. `kbn-repo-packages` already refuses such a `kibana.jsonc`; this covers
 * plugins discovered from a `kibana.json` on disk.
 */
const assertInitializationIsServerSide = (pluginMap: Map<PluginName, PluginWrapper>): void => {
  for (const plugin of pluginMap.values()) {
    if (plugin.hasInitialization && !plugin.includesServerPlugin) {
      throw new Error(
        `Plugin "${plugin.name}" sets "hasInitialization: true" but has no server entry; initialize() is a server-side lifecycle.`
      );
    }
  }
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

/**
 * Finds all circular dependencies in the plugin graph
 * @param dependencyGraph Map of plugin names to their unresolved dependencies
 * @returns Array of circular dependency paths
 */
export const findCircularDependencies = (
  dependencyGraph: Map<PluginName, Set<PluginName>>
): PluginName[][] => {
  // Store found cycles as a set of stringified paths to avoid duplicates
  const cycleSet = new Set<string>();
  const cycles: PluginName[][] = [];

  // Find all cycles for each node in the graph
  for (const startNode of dependencyGraph.keys()) {
    // Track visited and recursion stack for this specific search
    const visited = new Set<PluginName>();
    const recursionStack = new Set<PluginName>();
    const path: PluginName[] = [];

    const dfs = (node: PluginName) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = dependencyGraph.get(node) || new Set<PluginName>();

      for (const dependency of dependencies) {
        // If we haven't visited this dependency yet, explore it
        if (!visited.has(dependency)) {
          dfs(dependency);
        }
        // If the dependency is in our current recursion path, we found a cycle
        else if (recursionStack.has(dependency)) {
          // Extract the cycle
          const cycleStartIndex = path.indexOf(dependency);
          if (cycleStartIndex !== -1) {
            const cycle = path.slice(cycleStartIndex);
            // Create a canonical representation by starting from alphabetically first node
            const normalizedCycle = normalizeCycle(cycle);

            // Add to cycles if not already seen
            const cycleKey = JSON.stringify(normalizedCycle);
            if (!cycleSet.has(cycleKey)) {
              cycleSet.add(cycleKey);
              cycles.push(cycle);
            }
          }
        }
      }

      // Backtrack
      path.pop();
      recursionStack.delete(node);
    };

    dfs(startNode);
  }

  return cycles;
};

/**
 * Normalizes a cycle by rotating it to start with the alphabetically first node
 * This helps identify duplicate cycles regardless of where we start traversing
 */
export const normalizeCycle = (cycle: PluginName[]): PluginName[] => {
  if (cycle.length <= 1) return cycle;
  if (new Set(cycle).size !== cycle.length) {
    throw new Error(`Cycle contains duplicate plugins: ${cycle}`);
  }

  // Find the index of the alphabetically first node
  let minIndex = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i].localeCompare(cycle[minIndex]) < 0) {
      minIndex = i;
    }
  }

  // Rotate the array to start with that node
  return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
};
