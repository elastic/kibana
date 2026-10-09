import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
import type { KQLServerPlugin, KQLServerPluginSetup, KQLServerPluginStart } from './plugin';
/**
 * Static code to be shared externally
 * @public
 */
export declare function plugin(initializerContext: PluginInitializerContext<ConfigSchema>): Promise<KQLServerPlugin>;
export type { KQLServerPluginSetup as PluginSetup, KQLServerPluginStart as PluginStart };
export type { KQLServerPlugin as Plugin };
export declare const config: PluginConfigDescriptor<ConfigSchema>;
