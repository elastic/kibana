/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { SavedObjectsManagementPlugin } from './plugin';

export { FailedImport, ProcessedImportResponse, processImportResponse } from './lib';
export { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './plugin';
export {
  ISavedObjectsManagementServiceRegistry,
  SavedObjectsManagementAction,
  SavedObjectsManagementActionServiceSetup,
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumn,
  SavedObjectsManagementColumnServiceSetup,
  SavedObjectsManagementColumnServiceStart,
  SavedObjectsManagementRecord,
  SavedObjectsManagementServiceRegistryEntry,
} from './services';
export { SavedObjectMetadata, SavedObjectRelation, SavedObjectWithMetadata } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new SavedObjectsManagementPlugin();
}
