/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginContainer,
  ContainerModule,
  CreateModuleFn,
  ReadonlyContainer,
} from '@kbn/core-di-common';

/**
 * Public setup contract of the DI service.
 *
 * @public
 */
export interface CoreDiServiceSetup {
  /**
   * Setup the plugin module, registering the internal modules and returning the scoped modules
   * that should be shared with other plugins.
   *
   * @example
   * ```ts
   * core.di.setupModule((pluginContainer, { createModule }) => {
   *   // register internal modules that will only be visible at the plugin level.
   *   pluginModule.load(myInternalModule());
   *
   *   return {
   *     // will be exposed at the root container level
   *     global: createModule(({ bind }) => {
   *       bind(myInternalModule.publicServiceId)
   *         .toDynamicValue(() => {
   *            return childContainer.get(myInternalModule.publicServiceId);
   *          })
   *          .inSingletonScope();
   *      }),
   *      // will be exposed at the request container level
   *      request: createModule(({ bind }) => {
   *        bind(myRequestHandlerServiceId)
   *          .to(MyRequestHandlerService)
   *          .inRequestScope();
   *      })
   *   }
   * });
   * ```
   */
  setupModule(callback: CoreDiSetupModuleCallback): void;
}

export type CoreDiSetupModuleCallback = (
  pluginContainer: PluginContainer,
  helpers: CoreDiSetupModuleHelper
) => CoreDiSetupModuleCallbackResult;

export interface CoreDiSetupModuleHelper {
  createModule: CreateModuleFn;
}

export interface CoreDiSetupModuleCallbackResult {
  global?: ContainerModule;
  request?: ContainerModule;
}

/**
 * Public start contract of the DI service.
 * @public
 */
export interface CoreDiServiceStart {
  /**
   * The plugin-scoped container
   */
  container: ReadonlyContainer;
}
