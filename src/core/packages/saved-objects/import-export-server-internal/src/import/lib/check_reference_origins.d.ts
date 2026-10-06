/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { ImportStateMap } from './types';
export interface CheckReferenceOriginsParams {
  savedObjectsClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  namespace?: string;
  importStateMap: ImportStateMap;
}
export declare function checkReferenceOrigins(params: CheckReferenceOriginsParams): Promise<{
  importStateMap: ImportStateMap;
}>;
