/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import typeDetect from 'type-detect';
import { firstValueFrom, Subject } from 'rxjs';
import { isPromise } from '@kbn/std';
import { isConfigSchema } from '@kbn/config-schema';

import { Logger } from '../logging';
import {
  AsyncPlugin,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
  PluginManifest,
  PluginOpaqueId,
  PluginType,
  PrebootPlugin,
} from './types';
import { CorePreboot, CoreSetup, CoreStart } from '..';

const OSS_PATH_REGEX = /[\/|\\]src[\/|\\]plugins[\/|\\]/; // Matches src/plugins directory on POSIX and Windows
const XPACK_PATH_REGEX = /[\/|\\]x-pack[\/|\\]plugins[\/|\\]/; // Matches x-pack/plugins directory on POSIX and Windows

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
  public readonly source: 'oss' | 'x-pack' | 'external';
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

  private instance?:
    | Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>
    | PrebootPlugin<TSetup, TPluginsSetup>
    | AsyncPlugin<TSetup, TStart, TPluginsSetup, TPluginsStart>;

  private readonly startDependencies$ = new Subject<[CoreStart, TPluginsStart, TStart]>();
  public readonly startDependencies = firstValueFrom(this.startDependencies$);

  constructor(
    public readonly params: {
      readonly path: string;
      readonly manifest: PluginManifest;
      readonly opaqueId: PluginOpaqueId;
      readonly initializerContext: PluginInitializerContext;
    }
  ) {
    this.path = params.path;
    this.source = getPluginSource(params.path);
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

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public setup(
    setupContext: CoreSetup<TPluginsStart> | CorePreboot,
    plugins: TPluginsSetup
  ): TSetup | Promise<TSetup> {
    this.instance = this.createPluginInstance();

    if (this.isPrebootPluginInstance(this.instance)) {
      return this.instance.setup(setupContext as CorePreboot, plugins);
    }

    return this.instance.setup(setupContext as CoreSetup, plugins);
  }

  /**
   * Calls `start` function exposed by the initialized plugin.
   * @param startContext Context that consists of various core services tailored specifically
   * for the `start` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `start` function.
   */
  public start(startContext: CoreStart, plugins: TPluginsStart): TStart | Promise<TStart> {
    if (this.instance === undefined) {
      throw new Error(`Plugin "${this.name}" can't be started since it isn't set up.`);
    }

    if (this.isPrebootPluginInstance(this.instance)) {
      throw new Error(`Plugin "${this.name}" is a preboot plugin and cannot be started.`);
    }

    const startContract = this.instance.start(startContext, plugins);
    if (isPromise(startContract)) {
      return startContract.then((resolvedContract) => {
        this.startDependencies$.next([startContext, plugins, resolvedContract]);
        return resolvedContract;
      });
    } else {
      this.startDependencies$.next([startContext, plugins, startContract]);
      return startContract;
    }
  }

  /**
   * Calls optional `stop` function exposed by the plugin initializer.
   */
  public async stop() {
    if (this.instance === undefined) {
      throw new Error(`Plugin "${this.name}" can't be stopped since it isn't set up.`);
    }

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

  private isPrebootPluginInstance(
    instance: PluginWrapper['instance']
  ): instance is PrebootPlugin<TSetup, TPluginsSetup> {
    return this.manifest.type === PluginType.preboot;
  }
}

function getPluginSource(path: string): 'oss' | 'x-pack' | 'external' {
  if (OSS_PATH_REGEX.test(path)) {
    return 'oss';
  } else if (XPACK_PATH_REGEX.test(path)) {
    return 'x-pack';
  }
  return 'external';
}
