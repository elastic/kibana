import type { PluginInitializerContext } from '@kbn/core/server';
export { DateFormat, DateNanosFormat } from './lib/converters';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").FieldFormatsPlugin>;
export type { FieldFormatsSetup, FieldFormatsStart } from './types';
