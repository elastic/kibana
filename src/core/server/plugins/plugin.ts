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

import { Type } from '@kbn/config-schema';

import { Logger } from '../logging';
import {
  Plugin,
  PluginInitializerContext,
  PluginManifest,
  PluginInitializer,
  PluginOpaqueId,
  PluginConfigDescriptor,
} from './types';
import { CoreSetup, CoreStart } from '..';

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
  public readonly path: string;
  public readonly manifest: PluginManifest;
  public readonly opaqueId: PluginOpaqueId;
  public readonly name: PluginManifest['id'];
  public readonly configPath: PluginManifest['configPath'];
  public readonly requiredPlugins: PluginManifest['requiredPlugins'];
  public readonly optionalPlugins: PluginManifest['optionalPlugins'];
  public readonly includesServerPlugin: PluginManifest['server'];
  public readonly includesUiPlugin: PluginManifest['ui'];

  private readonly log: Logger;
  private readonly initializerContext: PluginInitializerContext;

  private instance?: Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>;

  constructor(
    public readonly params: {
      readonly path: string;
      readonly manifest: PluginManifest;
      readonly opaqueId: PluginOpaqueId;
      readonly initializerContext: PluginInitializerContext;
    }
  ) {
    this.path = params.path;
    this.manifest = params.manifest;
    this.opaqueId = params.opaqueId;
    this.initializerContext = params.initializerContext;
    this.log = params.initializerContext.logger.get();
    this.name = params.manifest.id;
    this.configPath = params.manifest.configPath;
    this.requiredPlugins = params.manifest.requiredPlugins;
    this.optionalPlugins = params.manifest.optionalPlugins;
    this.includesServerPlugin = params.manifest.server;
    this.includesUiPlugin = params.manifest.ui;
  }

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public async setup(setupContext: CoreSetup, plugins: TPluginsSetup) {
    this.instance = this.createPluginInstance();

    this.log.info('Setting up plugin');

    return await this.instance.setup(setupContext, plugins);
  }

  /**
   * Calls `start` function exposed by the initialized plugin.
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

  public getConfigDescriptor(): PluginConfigDescriptor | null {
    if (!this.manifest.server) {
      return null;
    }
    const pluginPathServer = join(this.path, 'server');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pluginDefinition = require(pluginPathServer);

    if (!('config' in pluginDefinition)) {
      this.log.debug(`"${pluginPathServer}" does not export "config".`);
      return null;
    }

    const configDescriptor = pluginDefinition.config;
    if (!(configDescriptor.schema instanceof Type)) {
      throw new Error('Configuration schema expected to be an instance of Type');
    }
    return configDescriptor;
  }

  private createPluginInstance() {
    this.log.debug('Initializing plugin');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pluginDefinition = require(join(this.path, 'server'));
    if (!('plugin' in pluginDefinition)) {
      throw new Error(`Plugin "${this.name}" does not export "plugin" definition (${this.path}).`);
    }

    const { plugin: initializer } = pluginDefinition as {
      plugin: PluginInitializer<TSetup, TStart, TPluginsSetup, TPluginsStart>;
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
