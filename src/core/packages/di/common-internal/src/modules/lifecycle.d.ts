import { ContainerModule } from 'inversify';
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
export type ServiceIdentifierFactory<TBase> = <T extends TBase, K extends keyof T>(key: K) => ServiceToken<T[K]>;
/** @internal */
export declare const InternalPluginInitializer: ServiceIdentifierFactory<InternalPluginInitializerContext>;
/** @internal */
export declare const InternalCoreSetup: ServiceIdentifierFactory<unknown>;
/** @internal */
export declare const InternalCoreStart: ServiceIdentifierFactory<InternalCoreStartContext>;
/** @internal */
export declare function createSetupModule<TPluginInitializerContext extends InternalPluginInitializerContext, TCoreSetupContext extends object, TPluginsSetup extends object>(pluginInitializerContext: TPluginInitializerContext, coreSetupContext: TCoreSetupContext, plugins: TPluginsSetup): ContainerModule;
/** @internal */
export declare function createStartModule<TCoreStartContext extends InternalCoreStartContext, TPluginsStart extends object>(coreStartContext: TCoreStartContext, plugins: TPluginsStart): ContainerModule;
