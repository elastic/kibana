/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { collectSavedObjects } from './collect_saved_objects';
import {
  SavedObjectsImportError,
  SavedObjectsImportResponse,
  SavedObjectsImportOptions,
} from './types';
import { validateReferences } from './validate_references';
import { checkOriginConflicts } from './check_origin_conflicts';
import { createSavedObjects } from './create_saved_objects';
import { checkConflicts } from './check_conflicts';
import { regenerateIds } from './regenerate_ids';

/**
 * Import saved objects from given stream. See the {@link SavedObjectsImportOptions | options} for more
 * detailed information.
 *
 * @public
 */
export async function importSavedObjectsFromStream({
  readStream,
  objectLimit,
  overwrite,
  createNewCopies,
  savedObjectsClient,
  typeRegistry,
  namespace,
}: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse> {
  let errorAccumulator: SavedObjectsImportError[] = [];
  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);

  // Get the objects to import
  const collectSavedObjectsResult = await collectSavedObjects({
    readStream,
    objectLimit,
    supportedTypes,
  });
  errorAccumulator = [...errorAccumulator, ...collectSavedObjectsResult.errors];
  /** Map of all IDs for objects that we are attempting to import; each value is empty by default */
  let importIdMap = collectSavedObjectsResult.importIdMap;

  // Validate references
  const validateReferencesResult = await validateReferences(
    collectSavedObjectsResult.collectedObjects,
    savedObjectsClient,
    namespace
  );
  errorAccumulator = [...errorAccumulator, ...validateReferencesResult.errors];

  let objectsToCreate = validateReferencesResult.filteredObjects;
  if (createNewCopies) {
    importIdMap = regenerateIds(collectSavedObjectsResult.collectedObjects);
  } else {
    // Check single-namespace objects for conflicts in this namespace, and check multi-namespace objects for conflicts across all namespaces
    const checkConflictsParams = {
      objects: validateReferencesResult.filteredObjects,
      savedObjectsClient,
      namespace,
      ignoreRegularConflicts: overwrite,
    };
    const checkConflictsResult = await checkConflicts(checkConflictsParams);
    errorAccumulator = [...errorAccumulator, ...checkConflictsResult.errors];
    importIdMap = new Map([...importIdMap, ...checkConflictsResult.importIdMap]);

    // Check multi-namespace object types for origin conflicts in this namespace
    const checkOriginConflictsParams = {
      objects: checkConflictsResult.filteredObjects,
      savedObjectsClient,
      typeRegistry,
      namespace,
      ignoreRegularConflicts: overwrite,
      importIdMap,
    };
    const checkOriginConflictsResult = await checkOriginConflicts(checkOriginConflictsParams);
    errorAccumulator = [...errorAccumulator, ...checkOriginConflictsResult.errors];
    importIdMap = new Map([...importIdMap, ...checkOriginConflictsResult.importIdMap]);
    objectsToCreate = checkOriginConflictsResult.filteredObjects;
  }

  // Create objects in bulk
  const createSavedObjectsParams = {
    objects: objectsToCreate,
    accumulatedErrors: errorAccumulator,
    savedObjectsClient,
    importIdMap,
    overwrite,
    namespace,
  };
  const createSavedObjectsResult = await createSavedObjects(createSavedObjectsParams);
  errorAccumulator = [...errorAccumulator, ...createSavedObjectsResult.errors];

  const successResults = createSavedObjectsResult.createdObjects.map(
    ({ type, id, destinationId, originId }) => {
      return {
        type,
        id,
        ...(destinationId && { destinationId }),
        ...(destinationId && !originId && !createNewCopies && { createNewCopy: true }),
      };
    }
  );

  return {
    successCount: createSavedObjectsResult.createdObjects.length,
    success: errorAccumulator.length === 0,
    ...(successResults.length && { successResults }),
    ...(errorAccumulator.length && { errors: errorAccumulator }),
  };
}
