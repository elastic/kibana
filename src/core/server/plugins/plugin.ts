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
import { PluginManifest, PluginName } from '../../types';
import { Logger } from '../logging';
import { PluginInitializerContext, PluginStartContext } from './plugin_context';

/**
 * Small container object used to expose information about discovered plugins that may
 * or may not have been started.
 * @internal
 */
export interface DiscoveredPlugin {
  readonly id: PluginName;

  readonly path: string;

  readonly manifest: PluginManifest;
}

type PluginInitializer<TExposed, TDependencies extends Record<PluginName, unknown>> = (
  coreContext: PluginInitializerContext
) => {
  start: (pluginStartContext: PluginStartContext, dependencies: TDependencies) => TExposed;
  stop?: () => void;
};

/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 * @internal
 */
export class Plugin<
  TStart = unknown,
  TDependencies extends Record<PluginName, unknown> = Record<PluginName, unknown>
> {
  public readonly name: PluginManifest['id'];
  public readonly configPath: PluginManifest['configPath'];
  public readonly requiredDependencies: PluginManifest['requiredPlugins'];
  public readonly optionalDependencies: PluginManifest['optionalPlugins'];
  public readonly includesServerPlugin: PluginManifest['server'];
  public readonly includesUiPlugin: PluginManifest['ui'];

  private readonly log: Logger;

  private instance?: ReturnType<PluginInitializer<TStart, TDependencies>>;

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
   * Instantiates plugin and calls `start` function exposed by the plugin initializer.
   * @param startContext Context that consists of various core services tailored specifically
   * for the `start` lifecycle event.
   * @param dependencies The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `start` function.
   */
  public async start(startContext: PluginStartContext, dependencies: TDependencies) {
    this.instance = this.createPluginInstance();

    this.log.info('Starting plugin');

    return await this.instance.start(startContext, dependencies);
  }

  /**
   * Calls optional `stop` function exposed by the plugin initializer.
   */
  public async stop() {
    if (this.instance === undefined) {
      throw new Error(`Plugin "${this.name}" can't be stopped since it isn't started.`);
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
      plugin: PluginInitializer<TStart, TDependencies>;
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

    if (typeof instance.start !== 'function') {
      throw new Error(`Instance of plugin "${this.name}" does not define "start" function.`);
    }

    return instance;
  }
}
