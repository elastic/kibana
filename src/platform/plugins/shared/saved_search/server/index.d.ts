import type { PluginInitializerContext } from '@kbn/core-plugins-server';
export type { DiscoverSessionTab, DiscoverSessionTabAttributes, DiscoverSessionAttributes, } from './saved_objects/schema';
export { getSavedSearch } from './services/saved_searches';
export declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").SavedSearchServerPlugin>;
