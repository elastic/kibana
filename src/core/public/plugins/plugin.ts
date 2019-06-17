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

import { DiscoveredPlugin, PluginName } from '../../server';
import { PluginInitializerContext } from './plugin_context';
import { loadPluginBundle } from './plugin_loader';
import { CoreStart, CoreSetup } from '..';

/**
 * The interface that should be returned by a `PluginInitializer`.
 *
 * @public
 */
export interface Plugin<
  TSetup,
  TStart,
  TPluginsSetup extends Record<string, unknown> = {},
  TPluginsStart extends Record<string, unknown> = {}
> {
  setup: (core: CoreSetup, plugins: TPluginsSetup) => TSetup | Promise<TSetup>;
  start: (core: CoreStart, plugins: TPluginsStart) => TStart | Promise<TStart>;
  stop?: () => void;
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
  TPluginsSetup extends Record<string, unknown> = {},
  TPluginsStart extends Record<string, unknown> = {}
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
  TPluginsSetup extends Record<PluginName, unknown> = Record<PluginName, unknown>,
  TPluginsStart extends Record<PluginName, unknown> = Record<PluginName, unknown>
> {
  public readonly name: DiscoveredPlugin['id'];
  public readonly configPath: DiscoveredPlugin['configPath'];
  public readonly requiredPlugins: DiscoveredPlugin['requiredPlugins'];
  public readonly optionalPlugins: DiscoveredPlugin['optionalPlugins'];
  private initializer?: PluginInitializer<TSetup, TStart, TPluginsSetup, TPluginsStart>;
  private instance?: Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>;

  constructor(
    readonly discoveredPlugin: DiscoveredPlugin,
    private readonly initializerContext: PluginInitializerContext
  ) {
    this.name = discoveredPlugin.id;
    this.configPath = discoveredPlugin.configPath;
    this.requiredPlugins = discoveredPlugin.requiredPlugins;
    this.optionalPlugins = discoveredPlugin.optionalPlugins;
  }

  /**
   * Loads the plugin's bundle into the browser. Should be called in parallel with all plugins
   * using `Promise.all`. Must be called before `setup`.
   * @param addBasePath Function that adds the base path to a string for plugin bundle path.
   */
  public async load(addBasePath: (path: string) => string) {
    this.initializer = await loadPluginBundle<TSetup, TStart, TPluginsSetup, TPluginsStart>(
      addBasePath,
      this.name
    );
  }

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public async setup(setupContext: CoreSetup, plugins: TPluginsSetup) {
    this.instance = await this.createPluginInstance();

    return await this.instance.setup(setupContext, plugins);
  }

  /**
   * Calls `setup` function exposed by the initialized plugin.
   * @param startContext Context that consists of various core services tailored specifically
   * for the `start` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `start` function.
   */
  public async start(startContext: CoreStart, plugins: TPluginsStart) {
    if (this.instance === undefined) {
      throw new Error(`Plugin "${this.name}" can't be started since it isn't set up.`);
    }

    return await this.instance.start(startContext, plugins);
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

  private async createPluginInstance() {
    if (this.initializer === undefined) {
      throw new Error(`Plugin "${this.name}" can't be setup since its bundle isn't loaded.`);
    }

    const instance = this.initializer(this.initializerContext);

    if (typeof instance.setup !== 'function') {
      throw new Error(`Instance of plugin "${this.name}" does not define "setup" function.`);
    } else if (typeof instance.start !== 'function') {
      throw new Error(`Instance of plugin "${this.name}" does not define "start" function.`);
    }

    return instance;
  }
}
