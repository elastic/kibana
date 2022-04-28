/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { PluginInfo } from './types';
import { loadPluginBundles } from './load_plugin_bundles';

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
  private readonly plugins = new Map<PluginName, PluginWrapper<unknown, unknown>>();
  private readonly pluginDependencies = new Map<PluginName, PluginName[]>();

  private readonly satupPlugins: PluginName[] = [];

  private readonly pluginSetupContracts = new Map<PluginName, unknown>();
  private readonly pluginStartContracts = new Map<PluginName, unknown>();

  private coreInternalSetup?: PluginsServiceSetupDeps;
  private coreInternalStart?: PluginsServiceStartDeps;

  constructor(private readonly coreContext: CoreContext, plugins: InjectedPluginMetadata[]) {
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

  public async setup(deps: PluginsServiceSetupDeps): Promise<PluginsServiceSetup> {
    this.coreInternalSetup = deps;

    /*
    // Setup each plugin with required and optional plugin contracts
    for (const pluginName of this.plugins.keys()) {
      this.setupPlugin(pluginName);
    }
    */

    // Expose setup contracts
    return { contracts: this.pluginSetupContracts };
  }

  private setupPlugin(pluginName: PluginName) {
    const plugin = this.plugins.get(pluginName)!;
    const pluginDepContracts = [...this.pluginDependencies.get(pluginName)!].reduce(
      (depContracts, dependencyName) => {
        // Only set if present. Could be absent if plugin does not have client-side code or is a
        // missing optional plugin.
        if (this.pluginSetupContracts.has(dependencyName)) {
          depContracts[dependencyName] = this.pluginSetupContracts.get(dependencyName);
        }

        return depContracts;
      },
      {} as Record<PluginName, unknown>
    );

    const contract = plugin.setup(
      createPluginSetupContext(this.coreContext, this.coreInternalSetup!, plugin),
      pluginDepContracts
    );

    this.pluginSetupContracts.set(pluginName, contract);
    this.satupPlugins.push(pluginName);
  }

  public async start(deps: PluginsServiceStartDeps): Promise<PluginsServiceStart> {
    this.coreInternalStart = deps;

    deps.application.setEnsureDependenciesLoaded((pluginId: string) =>
      this.loadPluginDependencies(pluginId)
    );

    /*
    // Setup each plugin with required and optional plugin contracts
    for (const pluginName of this.plugins.keys()) {
      this.startPlugin(pluginName);
    }
    */

    // Expose start contracts
    return {
      contracts: this.pluginStartContracts,
    };
  }

  private async loadPluginDependencies(pluginId: string): Promise<void> {
    // plugin already instantiated, returning.
    if (this.pluginSetupContracts.has(pluginId)) {
      return Promise.resolve();
    }

    console.log('plugin_service loadPluginDependencies', pluginId);

    const { plugins } = await this.coreInternalStart!.http.get<{ plugins: PluginInfo[] }>(
      `/internal/core/rendering/plugin/${pluginId}/dependencies`
    );

    return await this.loadPluginsAsync(plugins);
  }

  private async loadPluginsAsync(plugins: PluginInfo[]): Promise<void> {
    const pluginsToLoad = plugins.filter(
      ({ pluginId }) => !this.pluginSetupContracts.has(pluginId)
    );

    await loadPluginBundles(pluginsToLoad);

    const pluginIds = pluginsToLoad.map(({ pluginId }) => pluginId);
    for (const pluginId of pluginIds) {
      this.setupPlugin(pluginId);
    }
    for (const pluginId of pluginIds) {
      this.startPlugin(pluginId);
    }
  }

  private startPlugin(pluginName: PluginName) {
    const plugin = this.plugins.get(pluginName)!;
    const pluginDepContracts = [...this.pluginDependencies.get(pluginName)!].reduce(
      (depContracts, dependencyName) => {
        // Only set if present. Could be absent if plugin does not have client-side code or is a
        // missing optional plugin.
        if (this.pluginStartContracts.has(dependencyName)) {
          depContracts[dependencyName] = this.pluginStartContracts.get(dependencyName);
        }

        return depContracts;
      },
      {} as Record<PluginName, unknown>
    );

    const contract = plugin.start(
      createPluginStartContext(this.coreContext, this.coreInternalStart!, plugin),
      pluginDepContracts
    );

    this.pluginStartContracts.set(pluginName, contract);
  }

  public async stop() {
    // Stop plugins in reverse topological order.
    for (const pluginName of this.satupPlugins.reverse()) {
      this.plugins.get(pluginName)!.stop();
    }
  }
}
