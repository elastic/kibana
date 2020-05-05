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
import { checkConflicts } from './check_conflicts';
import { createSavedObjects } from './create_saved_objects';

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
  savedObjectsClient,
  typeRegistry,
  namespace,
}: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse> {
  let errorAccumulator: SavedObjectsImportError[] = [];
  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);

  // Get the objects to import
  const {
    errors: collectorErrors,
    collectedObjects: objectsFromStream,
  } = await collectSavedObjects({ readStream, objectLimit, supportedTypes });
  errorAccumulator = [...errorAccumulator, ...collectorErrors];

  // Validate references
  const validateReferencesResult = await validateReferences(
    objectsFromStream,
    savedObjectsClient,
    namespace
  );
  errorAccumulator = [...errorAccumulator, ...validateReferencesResult.errors];

  // Check multi-namespace object types for regular conflicts and ambiguous conflicts
  const checkConflictsOptions = { savedObjectsClient, typeRegistry, namespace };
  const { filteredObjects, errors: conflictErrors, importIdMap } = await checkConflicts(
    validateReferencesResult.filteredObjects,
    checkConflictsOptions
  );
  errorAccumulator = [...errorAccumulator, ...conflictErrors];

  // Create objects in bulk
  const createSavedObjectsOptions = { savedObjectsClient, importIdMap, overwrite, namespace };
  const { createdObjects, errors: bulkCreateErrors } = await createSavedObjects(
    filteredObjects,
    createSavedObjectsOptions
  );
  errorAccumulator = [...errorAccumulator, ...bulkCreateErrors];

  const successResults = createdObjects.map(({ type, id, newId }) => {
    return { type, id, ...(newId && { newId }) };
  });

  return {
    successCount: createdObjects.length,
    success: errorAccumulator.length === 0,
    ...(successResults.length && { successResults }),
    ...(errorAccumulator.length && { errors: errorAccumulator }),
  };
}
