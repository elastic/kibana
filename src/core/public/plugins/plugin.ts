/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Subject } from 'rxjs';
import { DiscoveredPlugin, PluginOpaqueId } from '../../server';
import { PluginInitializerContext } from './plugin_context';
import { read } from './plugin_reader';
import { CoreStart, CoreSetup } from '..';

/**
 * The interface that should be returned by a `PluginInitializer`.
 *
 * @public
 */
export interface Plugin<
  TSetup = void,
  TStart = void,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> {
  setup(core: CoreSetup<TPluginsStart, TStart>, plugins: TPluginsSetup): TSetup;
  start(core: CoreStart, plugins: TPluginsStart): TStart;
  stop?(): void;
}

/**
 * The `plugin` export at the root of a plugin's `public` directory should conform
 * to this interface.
 *
 * @public
 */
export type PluginInitializer<
  TSetup,
  TStart,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> = (core: PluginInitializerContext) => Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>;

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
  }

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public setup(setupContext: CoreSetup<TPluginsStart, TStart>, plugins: TPluginsSetup): TSetup {
    this.instance = this.createPluginInstance();
    return this.instance.setup(setupContext, plugins);
  }

  /**
   * Calls `setup` function exposed by the initialized plugin.
   * @param startContext Context that consists of various core services tailored specifically
   * for the `start` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `start` function.
   */
  public start(startContext: CoreStart, plugins: TPluginsStart) {
    if (this.instance === undefined) {
      throw new Error(`Plugin "${this.name}" can't be started since it isn't set up.`);
    }

    const startContract = this.instance.start(startContext, plugins);
    this.startDependencies$.next([startContext, plugins, startContract]);
    return startContract;
  }

  /**
   * Calls optional `stop` function exposed by the plugin initializer.
   */
  public stop() {
    if (this.instance === undefined) {
      throw new Error(`Plugin "${this.name}" can't be stopped since it isn't set up.`);
    }

    if (typeof this.instance.stop === 'function') {
      this.instance.stop();
    }

    this.instance = undefined;
  }

  private createPluginInstance() {
    const initializer = read(this.name) as PluginInitializer<
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
