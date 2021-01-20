/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { SavedObjectsManagementPlugin } from './plugin';

export { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './plugin';
export {
  SavedObjectsManagementActionServiceSetup,
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementAction,
  SavedObjectsManagementColumnServiceSetup,
  SavedObjectsManagementColumnServiceStart,
  SavedObjectsManagementColumn,
  SavedObjectsManagementRecord,
  ISavedObjectsManagementServiceRegistry,
  SavedObjectsManagementServiceRegistryEntry,
} from './services';
export { ProcessedImportResponse, processImportResponse, FailedImport } from './lib';
export { SavedObjectRelation, SavedObjectWithMetadata, SavedObjectMetadata } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new SavedObjectsManagementPlugin();
}
