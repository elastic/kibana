/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModule } from 'inversify';
import type { LoggerFactory } from '@kbn/logging';
import type { ServiceToken, CoreDiServiceStart } from '@kbn/core-di';
/** @internal */
export interface InternalPluginInitializerContext {
  logger: LoggerFactory;
}
/** @internal */
export interface InternalCoreStartContext {
  injection: CoreDiServiceStart;
}
/** @internal */
export type ServiceIdentifierFactory<TBase> = <T extends TBase, K extends keyof T>(
  key: K
) => ServiceToken<T[K]>;
/** @internal */
export declare const InternalPluginInitializer: ServiceIdentifierFactory<InternalPluginInitializerContext>;
/** @internal */
export declare const InternalCoreSetup: ServiceIdentifierFactory<unknown>;
/** @internal */
export declare const InternalCoreStart: ServiceIdentifierFactory<InternalCoreStartContext>;
/** @internal */
export declare function createSetupModule<
  TPluginInitializerContext extends InternalPluginInitializerContext,
  TCoreSetupContext extends object,
  TPluginsSetup extends object
>(
  pluginInitializerContext: TPluginInitializerContext,
  coreSetupContext: TCoreSetupContext,
  plugins: TPluginsSetup
): ContainerModule;
/** @internal */
export declare function createStartModule<
  TCoreStartContext extends InternalCoreStartContext,
  TPluginsStart extends object
>(coreStartContext: TCoreStartContext, plugins: TPluginsStart): ContainerModule;
