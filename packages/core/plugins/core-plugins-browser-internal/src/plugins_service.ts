/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreService, CoreContext } from '@kbn/core-base-browser-internal';
import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';
import type { InjectedMetadataPlugin } from '@kbn/core-injected-metadata-common-internal';
import type { InternalCoreSetup, InternalCoreStart } from '@kbn/core-lifecycle-browser-internal';
import { PluginWrapper } from './plugin';
import {
  createPluginInitializerContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';
import { RuntimePluginContractResolver } from './plugin_contract_resolver';

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

      const contract = plugin.setup(
        createPluginSetupContext({
          deps,
          plugin,
          runtimeResolver: this.runtimeResolver,
        }),
        pluginDepContracts
      );

      contracts.set(pluginName, contract);
      this.satupPlugins.push(pluginName);
    }

    this.runtimeResolver.resolveSetupRequests(contracts);

    // Expose setup contracts
    return { contracts };
  }

  public async start(deps: PluginsServiceStartDeps): Promise<InternalPluginsServiceStart> {
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

      const contract = plugin.start(
        createPluginStartContext({
          deps,
          plugin,
          runtimeResolver: this.runtimeResolver,
        }),
        pluginDepContracts
      );

      contracts.set(pluginName, contract);
    }

    this.runtimeResolver.resolveStartRequests(contracts);

    // Expose start contracts
    return { contracts };
  }

  public async stop() {
    // Stop plugins in reverse topological order.
    for (const pluginName of this.satupPlugins.reverse()) {
      this.plugins.get(pluginName)!.stop();
    }
  }
}

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
