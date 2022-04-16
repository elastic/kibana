/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { SavedObjectsManagementPlugin } from './plugin';

export type {
  SavedObjectsManagementPluginSetup,
  SavedObjectsManagementPluginStart,
} from './plugin';
export type {
  SavedObjectsManagementActionServiceSetup,
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnServiceSetup,
  SavedObjectsManagementColumnServiceStart,
  SavedObjectsManagementColumn,
  SavedObjectsManagementRecord,
} from './services';
export { SavedObjectsManagementAction } from './services';
export type { ProcessedImportResponse, FailedImport } from './lib';
export { processImportResponse } from './lib';
export type { SavedObjectRelation, SavedObjectWithMetadata, SavedObjectMetadata } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new SavedObjectsManagementPlugin();
}
