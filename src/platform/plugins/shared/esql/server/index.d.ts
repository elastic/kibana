import type { PluginInitializerContext } from '@kbn/core/server';
import type { EsqlServerPluginSetup } from './types';
export declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").EsqlServerPlugin>;
export type { EsqlServerPluginSetup as PluginSetup };
