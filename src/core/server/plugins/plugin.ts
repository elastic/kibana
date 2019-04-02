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

import { join } from 'path';
import typeDetect from 'type-detect';
import { ConfigPath } from '../config';
import { Logger } from '../logging';
import { PluginInitializerContext, PluginSetupContext } from './plugin_context';

/**
 * Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays
 * that use it as a key or value more obvious.
 */
export type PluginName = string;

/**
 * Describes the set of required and optional properties plugin can define in its
 * mandatory JSON manifest file.
 * @internal
 */
export interface PluginManifest {
  /**
   * Identifier of the plugin.
   */
  readonly id: PluginName;

  /**
   * Version of the plugin.
   */
  readonly version: string;

  /**
   * The version of Kibana the plugin is compatible with, defaults to "version".
   */
  readonly kibanaVersion: string;

  /**
   * Root configuration path used by the plugin, defaults to "id".
   */
  readonly configPath: ConfigPath;

  /**
   * An optional list of the other plugins that **must be** installed and enabled
   * for this plugin to function properly.
   */
  readonly requiredPlugins: ReadonlyArray<PluginName>;

  /**
   * An optional list of the other plugins that if installed and enabled **may be**
   * leveraged by this plugin for some additional functionality but otherwise are
   * not required for this plugin to work properly.
   */
  readonly optionalPlugins: ReadonlyArray<PluginName>;

  /**
   * Specifies whether plugin includes some client/browser specific functionality
   * that should be included into client bundle via `public/ui_plugin.js` file.
   */
  readonly ui: boolean;

  /**
   * Specifies whether plugin includes some server-side specific functionality.
   */
  readonly server: boolean;
}

/**
 * Small container object used to expose information about discovered plugins that may
 * or may not have been started.
 * @internal
 */
export interface DiscoveredPlugin {
  /**
   * Identifier of the plugin.
   */
  readonly id: PluginName;

  /**
   * Root configuration path used by the plugin, defaults to "id".
   */
  readonly configPath: ConfigPath;

  /**
   * An optional list of the other plugins that **must be** installed and enabled
   * for this plugin to function properly.
   */
  readonly requiredPlugins: ReadonlyArray<PluginName>;

  /**
   * An optional list of the other plugins that if installed and enabled **may be**
   * leveraged by this plugin for some additional functionality but otherwise are
   * not required for this plugin to work properly.
   */
  readonly optionalPlugins: ReadonlyArray<PluginName>;
}

/**
 * An extended `DiscoveredPlugin` that exposes more sensitive information. Should never
 * be exposed to client-side code.
 * @internal
 */
export interface DiscoveredPluginInternal extends DiscoveredPlugin {
  /**
   * Path on the filesystem where plugin was loaded from.
   */
  readonly path: string;
}

type PluginInitializer<TExposedSetup, TDependenciesSetup extends Record<PluginName, unknown>> = (
  coreContext: PluginInitializerContext
) => {
  setup: (
    pluginSetupContext: PluginSetupContext,
    dependencies: TDependenciesSetup
  ) => TExposedSetup;
  stop?: () => void;
};

/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 * @internal
 */
export class Plugin<
  TSetup = unknown,
  TDependenciesSetup extends Record<PluginName, unknown> = Record<PluginName, unknown>
> {
  public readonly name: PluginManifest['id'];
  public readonly configPath: PluginManifest['configPath'];
  public readonly requiredDependencies: PluginManifest['requiredPlugins'];
  public readonly optionalDependencies: PluginManifest['optionalPlugins'];
  public readonly includesServerPlugin: PluginManifest['server'];
  public readonly includesUiPlugin: PluginManifest['ui'];

  private readonly log: Logger;

  private instance?: ReturnType<PluginInitializer<TSetup, TDependenciesSetup>>;

  constructor(
    public readonly path: string,
    public readonly manifest: PluginManifest,
    private readonly initializerContext: PluginInitializerContext
  ) {
    this.log = initializerContext.logger.get();
    this.name = manifest.id;
    this.configPath = manifest.configPath;
    this.requiredDependencies = manifest.requiredPlugins;
    this.optionalDependencies = manifest.optionalPlugins;
    this.includesServerPlugin = manifest.server;
    this.includesUiPlugin = manifest.ui;
  }

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param dependencies The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public async setup(setupContext: PluginSetupContext, dependencies: TDependenciesSetup) {
    this.instance = this.createPluginInstance();

    this.log.info('Setting up plugin');

    return await this.instance.setup(setupContext, dependencies);
  }

  /**
   * Calls optional `stop` function exposed by the plugin initializer.
   */
  public async stop() {
    if (this.instance === undefined) {
      throw new Error(`Plugin "${this.name}" can't be stopped since it isn't set up.`);
    }

    this.log.info('Stopping plugin');

    if (typeof this.instance.stop === 'function') {
      await this.instance.stop();
    }

    this.instance = undefined;
  }

  private createPluginInstance() {
    this.log.debug('Initializing plugin');

    const pluginDefinition = require(join(this.path, 'server'));
    if (!('plugin' in pluginDefinition)) {
      throw new Error(`Plugin "${this.name}" does not export "plugin" definition (${this.path}).`);
    }

    const { plugin: initializer } = pluginDefinition as {
      plugin: PluginInitializer<TSetup, TDependenciesSetup>;
    };
    if (!initializer || typeof initializer !== 'function') {
      throw new Error(`Definition of plugin "${this.name}" should be a function (${this.path}).`);
    }

    const instance = initializer(this.initializerContext);
    if (!instance || typeof instance !== 'object') {
      throw new Error(
        `Initializer for plugin "${
          this.manifest.id
        }" is expected to return plugin instance, but returned "${typeDetect(instance)}".`
      );
    }

    if (typeof instance.setup !== 'function') {
      throw new Error(`Instance of plugin "${this.name}" does not define "setup" function.`);
    }

    return instance;
  }
}
