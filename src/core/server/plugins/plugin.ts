/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import typeDetect from 'type-detect';
import { isConfigSchema } from '@kbn/config-schema';

import { Logger } from '../logging';
import {
  OpaquePlugin,
  OpaquePluginInitializer,
  PluginConfigDescriptor,
  PluginInitializerContext,
  PluginManifest,
  PluginOpaqueId,
  PluginType,
  PrebootPlugin,
  Plugin,
} from './types';
import { PrebootPluginInstance } from './preboot_plugin_instance';
import { StandardPluginInstance } from './standard_plugin_instance';

type PluginInstance<T> = T extends PluginType.preboot
  ? PrebootPluginInstance
  : StandardPluginInstance;

/**
 * Lightweight wrapper around discovered plugin that is responsible for instantiating
 * plugin and dispatching proper context and dependencies into plugin's lifecycle hooks.
 *
 * @internal
 */
export class PluginWrapper {
  public readonly path: string;
  public readonly manifest: PluginManifest;
  public readonly opaqueId: PluginOpaqueId;
  public readonly name: PluginManifest['id'];
  public readonly configPath: PluginManifest['configPath'];
  public readonly requiredPlugins: PluginManifest['requiredPlugins'];
  public readonly optionalPlugins: PluginManifest['optionalPlugins'];
  public readonly requiredBundles: PluginManifest['requiredBundles'];
  public readonly includesServerPlugin: PluginManifest['server'];
  public readonly includesUiPlugin: PluginManifest['ui'];

  private readonly log: Logger;
  private readonly initializerContext: PluginInitializerContext;

  private instance?: OpaquePlugin;

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
    this.requiredBundles = params.manifest.requiredBundles;
    this.includesServerPlugin = params.manifest.server;
    this.includesUiPlugin = params.manifest.ui;
  }

  public getInstance<T extends PluginType>(): PluginInstance<T> {
    if (this.instance === undefined) {
      this.instance = this.createPluginInstance();
    }

    return this.instance as PluginInstance<T>;
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
    if (!isConfigSchema(configDescriptor.schema)) {
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

    const { plugin: initializer } = pluginDefinition as { plugin: OpaquePluginInitializer };
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

    return this.manifest.type === PluginType.preboot
      ? new PrebootPluginInstance(this.instance as PrebootPlugin)
      : new StandardPluginInstance(this.name, this.instance as Plugin);
  }
}
