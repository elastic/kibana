import type { PluginInitializerContext } from '@kbn/core/public';
import { SavedObjectsManagementPlugin } from './plugin';
export type { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, } from './plugin';
export type { SavedObjectsManagementColumn, SavedObjectsManagementRecord } from './services';
export { SavedObjectsManagementAction } from './services';
export type { ProcessedImportResponse, FailedImport } from './lib';
export { processImportResponse, getTagFindReferences, parseQuery } from './lib';
export type { SavedObjectRelation, SavedObjectWithMetadata, SavedObjectMetadata, SavedObjectManagementTypeInfo, } from './types';
export declare function plugin(initializerContext: PluginInitializerContext): SavedObjectsManagementPlugin;
