/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginOpaqueId, PluginManifest } from '@kbn/core-base-common';
import type { ContainerModule, PluginContainer,  } from '@kbn/core-di-common';
import type {
  CoreDiServiceSetup,
  CoreDiServiceStart,
  CoreDiSetupModuleCallback,
} from '@kbn/core-di-server';

/** @internal */
export type InternalCoreDiServiceSetup = Omit<CoreDiServiceSetup, 'setupModule'> & {
  // public interfaces to be bridged to the public contract

  configurePluginModule(pluginId: PluginOpaqueId, callback: CoreDiSetupModuleCallback): void;

  // all APIs below are internal for Core usages only and not re-exposed

  createPluginContainer(pluginId: PluginOpaqueId, manifest: PluginManifest): PluginContainer;

  /**
   * Registers a plugin-scoped module that will be loaded for each plugin.
   * Used to register the plugin-scoped config, logger and so on.
   */
  registerPluginModule(module: ContainerModule): void;

  // TODO
  registerGlobalModule(module: ContainerModule): void;
  registerRequestModule(module: ContainerModule): void;
};

/** @internal */
export type InternalCoreDiServiceStart = CoreDiServiceStart;
