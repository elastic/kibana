/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginOpaqueId, PluginManifest } from '@kbn/core-base-common';
import type { ContainerModule, PluginContainer, ReadonlyContainer } from '@kbn/core-di-common';
import type { CoreDiSetupModuleCallback } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';

/** @internal */
export interface InternalCoreDiServiceSetup {
  // public interfaces to be bridged to the public contract

  configurePluginModule(pluginId: PluginOpaqueId, callback: CoreDiSetupModuleCallback): void;

  // all APIs below are internal for Core usages only and not re-exposed

  createPluginContainer(pluginId: PluginOpaqueId, manifest: PluginManifest): PluginContainer;

  /**
   * Registers a plugin-scoped module that will be loaded for each plugin.
   * Used to register the plugin-scoped config, logger and so on.
   */
  registerPluginModule(module: ContainerModule): void;

  registerGlobalModule(module: ContainerModule): void;

  registerRequestModule(module: ContainerModule): void;
}

/** @internal */
export interface InternalCoreDiServiceStart {
  getPluginContainer(pluginId: PluginOpaqueId): ReadonlyContainer;

  createRequestContainer(request: KibanaRequest, pluginId: PluginOpaqueId): ReadonlyContainer;

  disposeRequestContainer(request: KibanaRequest): boolean;
}
