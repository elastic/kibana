import type { PluginInitializerContext } from '@kbn/core/server';
export type { ConsoleSetup, ConsoleStart, SpecDefinitionsJson } from './types';
export { config } from './config';
export declare const plugin: (ctx: PluginInitializerContext) => Promise<import("./plugin").ConsoleServerPlugin>;
