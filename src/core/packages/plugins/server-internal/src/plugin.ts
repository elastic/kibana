/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container, ContainerModule } from 'inversify';
import { join } from 'path';
import typeDetect from 'type-detect';
import { firstValueFrom, Subject } from 'rxjs';
import { isPromise } from '@kbn/std';
import { isConfigSchema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { type PluginOpaqueId, PluginType } from '@kbn/core-base-common';
import type {
  Plugin,
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
  PluginManifest,
  PrebootPlugin,
} from '@kbn/core-plugins-server';
import type { CorePreboot, CoreSetup, CoreStart } from '@kbn/core-lifecycle-server';
import { PluginSetup, PluginStart, Setup, Start } from '@kbn/core-di';
import { toContainerModule } from '@kbn/core-di-internal';
import {
  CoreSetup as CoreSetupService,
  CoreStart as CoreStartService,
  PluginInitializer as PluginInitializerService,
} from '@kbn/core-di-server';

const OSS_PATH_REGEX = /[\/|\\]src[\/|\\]plugins[\/|\\]/; // Matches src/plugins directory on POSIX and Windows
const XPACK_PATH_REGEX = /[\/|\\]x-pack[\/|\\]plugins[\/|\\]/; // Matches x-pack/plugins directory on POSIX and Windows

interface PluginDefinition<
  TSetup = unknown,
  TStart = unknown,
  TPluginsSetup extends object = object,
  TPluginsStart extends object = object
> {
  readonly config?: PluginConfigDescriptor;
  readonly module?: ContainerModule;
  readonly plugin?: PluginInitializer<TSetup, TStart, TPluginsSetup, TPluginsStart>;
}

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
  public readonly runtimePluginDependencies: PluginManifest['runtimePluginDependencies'];
  public readonly requiredBundles: PluginManifest['requiredBundles'];
  public readonly includesServerPlugin: PluginManifest['server'];
  public readonly includesUiPlugin: PluginManifest['ui'];

  private readonly log: Logger;
  private readonly initializerContext: PluginInitializerContext;

  private definition?: PluginDefinition<TSetup, TStart, TPluginsSetup, TPluginsStart>;
  private instance?:
    | Plugin<TSetup, TStart, TPluginsSetup, TPluginsStart>
    | PrebootPlugin<TSetup, TPluginsSetup>;
  private container?: Container;

  private readonly startDependencies$ = new Subject<
    [CoreStart, TPluginsStart, TStart | undefined]
  >();
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
    this.runtimePluginDependencies = params.manifest.runtimePluginDependencies;
    this.includesServerPlugin = params.manifest.server;
    this.includesUiPlugin = params.manifest.ui;
  }

  public async init() {
    this.log.debug('Initializing plugin');

    this.definition = this.getPluginDefinition();
    this.instance = await this.createPluginInstance();

    if (!('plugin' in this.definition || 'module' in this.definition)) {
      throw new Error(
        `Plugin "${this.name}" does not export the "plugin" definition or "module" (${this.path}).`
      );
    }
  }

  /**
   * Instantiates plugin and calls `setup` function exposed by the plugin initializer.
   * @param setupContext Context that consists of various core services tailored specifically
   * for the `setup` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `setup` function.
   */
  public setup(
    setupContext: CoreSetup<TPluginsStart, TStart> | CorePreboot,
    plugins: TPluginsSetup
  ): TSetup | Promise<TSetup> {
    if (!this.definition) {
      throw new Error('The plugin is not initialized. Call the init method first.');
    }

    if (this.instance && this.isPrebootPluginInstance(this.instance)) {
      return this.instance.setup(setupContext as CorePreboot, plugins);
    }

    if (this.definition.module) {
      this.container = (setupContext as CoreSetup).injection.getContainer();
      this.container.loadSync(this.definition.module);
      this.container.loadSync(toContainerModule(this.initializerContext, PluginInitializerService));
      this.container.loadSync(toContainerModule(setupContext, CoreSetupService));
      this.container.loadSync(toContainerModule(plugins, PluginSetup));
    }

    return [
      this.instance?.setup(setupContext as CoreSetup<TPluginsStart, TStart>, plugins),
      this.container?.get<TSetup>(Setup),
    ].find(Boolean)!;
  }

  /**
   * Calls `start` function exposed by the initialized plugin.
   * @param startContext Context that consists of various core services tailored specifically
   * for the `start` lifecycle event.
   * @param plugins The dictionary where the key is the dependency name and the value
   * is the contract returned by the dependency's `start` function.
   */
  public start(startContext: CoreStart, plugins: TPluginsStart): TStart | Promise<TStart> {
    if (!this.definition) {
      throw new Error(`Plugin "${this.name}" can't be started since it isn't set up.`);
    }

    if (this.instance && this.isPrebootPluginInstance(this.instance)) {
      throw new Error(`Plugin "${this.name}" is a preboot plugin and cannot be started.`);
    }

    this.container?.loadSync(toContainerModule(startContext, CoreStartService));
    this.container?.loadSync(toContainerModule(plugins, PluginStart));

    const contract = [
      this.instance?.start(startContext, plugins),
      this.container?.get<TStart>(Start),
    ].find(Boolean)!;

    if (isPromise(contract)) {
      return contract.then((resolvedContract) => {
        this.startDependencies$.next([startContext, plugins, resolvedContract]);
        return resolvedContract!;
      });
    }

    this.startDependencies$.next([startContext, plugins, contract]);

    return contract;
  }

  /**
   * Calls optional `stop` function exposed by the plugin initializer.
   */
  public async stop() {
    if (!this.definition) {
      throw new Error(`Plugin "${this.name}" can't be stopped since it isn't set up.`);
    }

    await this.instance?.stop?.();
    await this.container?.unbindAll();
    this.instance = undefined;
    this.container = undefined;
  }

  public getConfigDescriptor(): PluginConfigDescriptor | null {
    if (!this.manifest.server) {
      return null;
    }
    const definition = this.getPluginDefinition();
    if (!definition.config) {
      this.log.debug(`Plugin "${this.name}" does not export "config" (${this.path}).`);
      return null;
    }

    const { config } = definition;
    if (!isConfigSchema(config.schema)) {
      throw new Error('Configuration schema expected to be an instance of Type');
    }
    return config;
  }

  protected getPluginDefinition(): PluginDefinition<TSetup, TStart, TPluginsSetup, TPluginsStart> {
    return require(join(this.path, 'server')) ?? {};
  }

  protected async createPluginInstance() {
    if (!this.definition?.plugin) {
      return;
    }

    const { plugin: initializer } = this.definition;
    if (!initializer || typeof initializer !== 'function') {
      throw new Error(`Definition of plugin "${this.name}" should be a function (${this.path}).`);
    }

    const instance = await initializer(this.initializerContext);
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
