import { ContainerModule, type ServiceIdentifier } from 'inversify';
import type { LoggerFactory } from '@kbn/logging';
/** @internal */
export interface InternalPluginInitializerContext {
    logger: LoggerFactory;
}
/** @internal */
export type ServiceIdentifierFactory<T> = <K extends keyof T>(key: K) => ServiceIdentifier<T[K]>;
/** @internal */
export declare const InternalPluginInitializer: ServiceIdentifierFactory<InternalPluginInitializerContext>;
/** @internal */
export declare const InternalCoreSetup: ServiceIdentifierFactory<unknown>;
/** @internal */
export declare const InternalCoreStart: ServiceIdentifierFactory<unknown>;
/** @internal */
export declare function createSetupModule<TPluginInitializerContext extends object, TCoreSetupContext extends object, TPluginsSetup extends object>(pluginInitializerContext: TPluginInitializerContext, coreSetupContext: TCoreSetupContext, plugins: TPluginsSetup): ContainerModule;
/** @internal */
export declare function createStartModule<TCoreStartContext extends object, TPluginsStart extends object>(coreStartContext: TCoreStartContext, plugins: TPluginsStart): ContainerModule;
