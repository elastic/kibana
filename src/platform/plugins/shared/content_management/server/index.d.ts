import type { PluginInitializerContext } from '@kbn/core/server';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").ContentManagementPlugin>;
export type { ContentManagementServerSetup, ContentManagementServerStart } from './types';
export type { ContentStorage, StorageContext, MSearchConfig } from './core';
