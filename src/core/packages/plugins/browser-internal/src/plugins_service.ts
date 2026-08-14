/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreService, CoreContext } from '@kbn/core-base-browser-internal';
import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';
import type { InjectedMetadataPlugin } from '@kbn/core-injected-metadata-common-internal';
import type { InternalCoreSetup, InternalCoreStart } from '@kbn/core-lifecycle-browser-internal';
import { type Context } from '@kbn/cordis';
import { PluginWrapper } from './plugin';
import {
  createPluginInitializerContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';
import { RuntimePluginContractResolver } from './plugin_contract_resolver';
import { createCordisRoot } from './cordis_root';
import { assertActive } from './barriers';
import { createBrowserSetupAdapter, createBrowserStartAdapter } from './cordis_browser_adapter';

/** @internal */
export type PluginsServiceSetupDeps = InternalCoreSetup;
/** @internal */
export type PluginsServiceStartDeps = InternalCoreStart;

/** @internal */
export interface InternalPluginsServiceSetup {
  contracts: ReadonlyMap<string, unknown>;
}

/** @internal */
export interface InternalPluginsServiceStart {
  contracts: ReadonlyMap<string, unknown>;
}

/**
 * Service responsible for loading plugin bundles, initializing plugins, and managing the lifecycle
 * of all plugins.
 *
 * @internal
 */
export class PluginsService
  implements CoreService<InternalPluginsServiceSetup, InternalPluginsServiceStart>
{
  private readonly runtimeResolver = new RuntimePluginContractResolver();
  /** Plugin wrappers in topological order. */
  private readonly plugins = new Map<PluginName, PluginWrapper<unknown, unknown>>();
  private readonly pluginDependencies = new Map<PluginName, PluginName[]>();

  private readonly satupPlugins: PluginName[] = [];
  private cordisCtx?: Context;

  constructor(private readonly coreContext: CoreContext, plugins: InjectedMetadataPlugin[]) {
    // Generate opaque ids
    const opaqueIds = new Map<PluginName, PluginOpaqueId>(plugins.map((p) => [p.id, Symbol(p.id)]));

    // Setup dependency map and plugin wrappers
    plugins.forEach(({ id, plugin, config = {} }) => {
      // Setup map of dependencies
      this.pluginDependencies.set(id, [
        ...plugin.requiredPlugins,
        ...plugin.optionalPlugins.filter((optPlugin) => opaqueIds.has(optPlugin)),
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
        deps.map((depId) => this.plugins.get(depId)!.opaqueId),
      ])
    );
  }

  public async setup(deps: PluginsServiceSetupDeps): Promise<InternalPluginsServiceSetup> {
    const runtimeDependencies = buildPluginRuntimeDependencyMap(this.plugins);
    this.runtimeResolver.setDependencyMap(runtimeDependencies);

    const contracts =
      this.coreContext.env.pluginsRuntime === 'cordis'
        ? await this.cordisSetup(deps)
        : this.legacySetup(deps);

    this.runtimeResolver.resolveSetupRequests(contracts);
    return { contracts };
  }

  public async start(deps: PluginsServiceStartDeps): Promise<InternalPluginsServiceStart> {
    const contracts =
      this.coreContext.env.pluginsRuntime === 'cordis'
        ? await this.cordisStart(deps)
        : this.legacyStart(deps);

    this.runtimeResolver.resolveStartRequests(contracts);

    // Test-only: expose an inert snapshot of cross-plugin navigation dependencies on `window`
    // for the navigation-dependency enforcement test. Gated behind the internal
    // `plugins.exposeNavDependencies` config (off by default); never enforces anything at runtime.
    // Loaded lazily so the snapshot module is kept out of the default page-load bundle.
    if (this.coreContext.env.exposeNavDependencies) {
      const { exposeNavDependenciesSnapshot } = await import('./nav_dependencies_snapshot');
      exposeNavDependenciesSnapshot({
        application: deps.application,
        opaqueIdToPluginId: new Map<PluginOpaqueId, PluginName>(
          [...this.plugins].map(([pluginName, plugin]) => [plugin.opaqueId, pluginName])
        ),
      });
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

  private legacySetup(deps: PluginsServiceSetupDeps): Map<string, unknown> {
    const contracts = new Map<string, unknown>();
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const pluginDepContracts = buildDepContracts(
        this.pluginDependencies.get(pluginName)!,
        contracts
      );
      const contract = plugin.setup(
        createPluginSetupContext({ deps, plugin, runtimeResolver: this.runtimeResolver }),
        pluginDepContracts
      );
      contracts.set(pluginName, contract);
      this.satupPlugins.push(pluginName);
    }
    return contracts;
  }

  private legacyStart(deps: PluginsServiceStartDeps): Map<string, unknown> {
    const contracts = new Map<string, unknown>();
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const pluginDepContracts = buildDepContracts(
        this.pluginDependencies.get(pluginName)!,
        contracts
      );
      const contract = plugin.start(
        createPluginStartContext({ deps, plugin, runtimeResolver: this.runtimeResolver }),
        pluginDepContracts
      );
      contracts.set(pluginName, contract);
    }
    return contracts;
  }

  private async cordisSetup(deps: PluginsServiceSetupDeps): Promise<Map<string, unknown>> {
    this.cordisCtx = createCordisRoot();
    this.cordisCtx.provide('core.setup', { ready: true });

    const contracts = new Map<string, unknown>();
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const setupContext = createPluginSetupContext({
        deps,
        plugin,
        runtimeResolver: this.runtimeResolver,
      });
      const { component, getContract, getCapturedError } = createBrowserSetupAdapter({
        plugin,
        plugins: this.plugins,
        setupContext,
        contracts,
      });
      const fiber = await this.cordisCtx.plugin(component);
      assertActive(fiber, getCapturedError(), pluginName, 'setup');
      contracts.set(pluginName, getContract());
      this.satupPlugins.push(pluginName);
    }

    this.cordisCtx.provide('core.setupComplete', { complete: true });
    return contracts;
  }

  private async cordisStart(deps: PluginsServiceStartDeps): Promise<Map<string, unknown>> {
    this.cordisCtx!.provide('core.start', { ready: true });

    const contracts = new Map<string, unknown>();
    for (const pluginName of this.satupPlugins) {
      const plugin = this.plugins.get(pluginName)!;
      const startContext = createPluginStartContext({
        deps,
        plugin,
        runtimeResolver: this.runtimeResolver,
      });
      const { component, getContract, getCapturedError } = createBrowserStartAdapter({
        plugin,
        plugins: this.plugins,
        startContext,
        startContracts: contracts,
      });
      const fiber = await this.cordisCtx!.plugin(component);
      assertActive(fiber, getCapturedError(), pluginName, 'start');
      contracts.set(pluginName, getContract());
    }
    return contracts;
  }
}

const buildDepContracts = (
  deps: PluginName[],
  contracts: Map<PluginName, unknown>
): Record<PluginName, unknown> =>
  deps.reduce(
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
