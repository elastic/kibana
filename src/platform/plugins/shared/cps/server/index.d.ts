import type { PluginInitializerContext } from '@kbn/core/server';
export type { CPSServerSetup, CPSServerStart } from './types';
export { config } from './config';
export declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").CPSServerPlugin>;
