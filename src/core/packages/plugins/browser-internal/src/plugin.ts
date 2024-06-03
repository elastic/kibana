/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, Subject } from 'rxjs';
import type { DiscoveredPlugin, PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreStart, CoreSetup } from '@kbn/core-lifecycle-browser';
import type {
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core-plugins-browser';
import { type PluginDefinition, read } from './plugin_reader';

/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 *
 * @internal
 */
export class PluginWrapper<
  TSetup = unknown,
  TStart = unknown,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> {
  public readonly name: DiscoveredPlugin['id'];
  public readonly configPath: DiscoveredPlugin['configPath'];
  public readonly requiredPlugins: DiscoveredPlugin['requiredPlugins'];
  public readonly optionalPlugins: DiscoveredPlugin['optionalPlugins'];
  public readonly runtimePluginDependencies: DiscoveredPlugin['runtimePluginDependencies'];
  private definition?: PluginDefinition;
  private instance?: Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>;

  private readonly startDependencies$ = new Subject<[CoreStart, TPluginsStart, TStart]>();
  public readonly startDependencies = firstValueFrom(this.startDependencies$);

  constructor(
    public readonly discoveredPlugin: DiscoveredPlugin,
    public readonly opaqueId: PluginOpaqueId,
    private readonly initializerContext: PluginInitializerContext
  ) {
    this.name = discoveredPlugin.id;
    this.configPath = discoveredPlugin.configPath;
    this.requiredPlugins = discoveredPlugin.requiredPlugins;
    this.optionalPlugins = discoveredPlugin.optionalPlugins;
    this.runtimePluginDependencies = discoveredPlugin.runtimePluginDependencies;
  }

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public setup(
    setupContext: CoreSetup<TPluginsStart, TStart>,
    plugins: TPluginsSetup
  ): TSetup | undefined {
    this.definition = read(this.name);
    this.instance = this.createPluginInstance();

    if (this.definition.module) {
      setupContext.injection.load(this.definition.module);
    }

    return this.instance?.setup(setupContext, plugins);
  }

  /**
   * Calls `setup` function exposed by the initialized plugin.
   * @param startContext Context that consists of various core services tailored specifically
   * for the `start` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `start` function.
   */
  public start(startContext: CoreStart, plugins: TPluginsStart): TStart | undefined {
    if (this.definition === undefined) {
      throw new Error(`Plugin "${this.name}" can't be started since it isn't set up.`);
    }

    if (!this.instance) {
      return;
    }

    const startContract = this.instance.start(startContext, plugins);
    this.startDependencies$.next([startContext, plugins, startContract]);
    return startContract;
  }

  /**
   * Calls optional `stop` function exposed by the plugin initializer.
   */
  public stop() {
    if (this.definition === undefined) {
      throw new Error(`Plugin "${this.name}" can't be stopped since it isn't set up.`);
    }

    if (typeof this.instance?.stop === 'function') {
      this.instance.stop();
    }

    this.instance = undefined;
  }

  private createPluginInstance() {
    if (!this.definition?.plugin) {
      return;
    }

    const initializer = this.definition.plugin as PluginInitializer<
      TSetup,
      TStart,
      TPluginsSetup,
      TPluginsStart
    >;
    const instance = initializer(this.initializerContext);

    if (typeof instance.setup !== 'function') {
      throw new Error(`Instance of plugin "${this.name}" does not define "setup" function.`);
    } else if (typeof instance.start !== 'function') {
      throw new Error(`Instance of plugin "${this.name}" does not define "start" function.`);
    }

    return instance;
  }
}
