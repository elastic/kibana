import type { CoreSetup as CoreSetupContext, CoreStart as CoreStartContext } from '@kbn/core-lifecycle-browser';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { type ServiceIdentifierFactory } from '@kbn/core-di-internal';
/**
 * The service identifier of {@link PluginInitializerContext}.
 * @param key The service key in the context.
 * @public
 */
export declare const PluginInitializer: ServiceIdentifierFactory<PluginInitializerContext>;
/**
 * The service identifier of {@link CoreSetupContext}.
 * @param key The service key in the context.
 * @public
 */
export declare const CoreSetup: ServiceIdentifierFactory<CoreSetupContext>;
/**
 * The service identifier of {@link CoreStartContext}.
 * @param key The service key in the context.
 * @public
 */
export declare const CoreStart: ServiceIdentifierFactory<CoreStartContext>;
