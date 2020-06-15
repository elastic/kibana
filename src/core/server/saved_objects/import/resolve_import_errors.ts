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
import { createObjectsFilter } from './create_objects_filter';
import { splitOverwrites } from './split_overwrites';
import {
  SavedObjectsImportError,
  SavedObjectsImportResponse,
  SavedObjectsResolveImportErrorsOptions,
} from './types';
import { validateReferences } from './validate_references';
import { validateRetries } from './validate_retries';
import { createSavedObjects } from './create_saved_objects';
import { getImportIdMapForRetries } from './check_conflicts';
import { SavedObject } from '../types';

/**
 * Resolve and return saved object import errors.
 * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed informations.
 *
 * @public
 */
export async function resolveSavedObjectsImportErrors({
  readStream,
  objectLimit,
  retries,
  savedObjectsClient,
  typeRegistry,
  namespace,
}: SavedObjectsResolveImportErrorsOptions): Promise<SavedObjectsImportResponse> {
  // throw a BadRequest error if we see invalid retries
  validateRetries(retries);

  let successCount = 0;
  let errorAccumulator: SavedObjectsImportError[] = [];
  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);
  const filter = createObjectsFilter(retries);

  // Get the objects to resolve errors
  const { errors: collectorErrors, collectedObjects: objectsToResolve } = await collectSavedObjects(
    {
      readStream,
      objectLimit,
      filter,
      supportedTypes,
    }
  );
  errorAccumulator = [...errorAccumulator, ...collectorErrors];

  // Create a map of references to replace for each object to avoid iterating through
  // retries for every object to resolve
  const retriesReferencesMap = new Map<string, { [key: string]: string }>();
  for (const retry of retries) {
    const map: { [key: string]: string } = {};
    for (const { type, from, to } of retry.replaceReferences) {
      map[`${type}:${from}`] = to;
    }
    retriesReferencesMap.set(`${retry.type}:${retry.id}`, map);
  }

  // Replace references
  for (const savedObject of objectsToResolve) {
    const refMap = retriesReferencesMap.get(`${savedObject.type}:${savedObject.id}`);
    if (!refMap) {
      continue;
    }
    for (const reference of savedObject.references || []) {
      if (refMap[`${reference.type}:${reference.id}`]) {
        reference.id = refMap[`${reference.type}:${reference.id}`];
      }
    }
  }

  // Validate references
  const { filteredObjects, errors: referenceErrors } = await validateReferences(
    objectsToResolve,
    savedObjectsClient,
    namespace
  );
  errorAccumulator = [...errorAccumulator, ...referenceErrors];

  // Check multi-namespace object types for regular conflicts and ambiguous conflicts
  const importIdMap = getImportIdMapForRetries(filteredObjects, { typeRegistry, retries });

  // Bulk create in two batches, overwrites and non-overwrites
  let successResults: Array<{ type: string; id: string; newId?: string }> = [];
  const bulkCreateObjects = async (objects: Array<SavedObject<unknown>>, overwrite?: boolean) => {
    const options = { savedObjectsClient, importIdMap, namespace, overwrite };
    const { createdObjects, errors: bulkCreateErrors } = await createSavedObjects(objects, options);
    errorAccumulator = [...errorAccumulator, ...bulkCreateErrors];
    successCount += createdObjects.length;
    successResults = [
      ...successResults,
      ...createdObjects.map(({ type, id, newId }) => ({ type, id, ...(newId && { newId }) })),
    ];
  };
  const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites(filteredObjects, retries);
  await bulkCreateObjects(objectsToOverwrite, true);
  await bulkCreateObjects(objectsToNotOverwrite);

  return {
    successCount,
    success: errorAccumulator.length === 0,
    ...(successResults.length && { successResults }),
    ...(errorAccumulator.length && { errors: errorAccumulator }),
  };
}
