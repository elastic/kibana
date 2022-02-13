/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { SavedObject, SavedObjectsClientContract, SavedObjectsImportRetry } from '../types';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import {
  SavedObjectsImportFailure,
  SavedObjectsImportHook,
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
} from './types';
import {
  collectSavedObjects,
  createObjectsFilter,
  splitOverwrites,
  regenerateIds,
  checkReferenceOrigins,
  validateReferences,
  validateRetries,
  createSavedObjects,
  getImportStateMapForRetries,
  checkConflicts,
  executeImportHooks,
  checkOriginConflicts,
  ImportStateMap,
} from './lib';

/**
 * Options to control the "resolve import" operation.
 */
export interface ResolveSavedObjectsImportErrorsOptions {
  /** The stream of {@link SavedObject | saved objects} to resolve errors from */
  readStream: Readable;
  /** The maximum number of object to import */
  objectLimit: number;
  /** client to use to perform the import operation */
  savedObjectsClient: SavedObjectsClientContract;
  /** The registry of all known saved object types */
  typeRegistry: ISavedObjectTypeRegistry;
  /** List of registered import hooks */
  importHooks: Record<string, SavedObjectsImportHook[]>;
  /** saved object import references to retry */
  retries: SavedObjectsImportRetry[];
  /** if specified, will import in given namespace */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
}

/**
 * Resolve and return saved object import errors.
 * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed information.
 *
 * @public
 */
export async function resolveSavedObjectsImportErrors({
  readStream,
  objectLimit,
  retries,
  savedObjectsClient,
  typeRegistry,
  importHooks,
  namespace,
  createNewCopies,
}: ResolveSavedObjectsImportErrorsOptions): Promise<SavedObjectsImportResponse> {
  // throw a BadRequest error if we see invalid retries
  validateRetries(retries);

  let successCount = 0;
  let errorAccumulator: SavedObjectsImportFailure[] = [];
  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);
  const filter = createObjectsFilter(retries);

  // Get the objects to resolve errors
  const collectSavedObjectsResult = await collectSavedObjects({
    readStream,
    objectLimit,
    filter,
    supportedTypes,
  });
  // Map of all IDs for objects that we are attempting to import, and any references that are not included in the read stream;
  // each value is empty by default
  let importStateMap = collectSavedObjectsResult.importStateMap;
  errorAccumulator = [...errorAccumulator, ...collectSavedObjectsResult.errors];

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
  for (const savedObject of collectSavedObjectsResult.collectedObjects) {
    const refMap = retriesReferencesMap.get(`${savedObject.type}:${savedObject.id}`);
    if (!refMap) {
      continue;
    }
    for (const reference of savedObject.references || []) {
      if (refMap[`${reference.type}:${reference.id}`]) {
        reference.id = refMap[`${reference.type}:${reference.id}`];
        // Any reference ID changed here will supersede the results of checkReferenceOrigins below; this is intentional.
      }
    }
  }

  // Check any references that aren't included in the import file and retries, to see if they have a match with a different origin
  const checkReferenceOriginsResult = await checkReferenceOrigins({
    savedObjectsClient,
    typeRegistry,
    namespace,
    importStateMap,
  });
  importStateMap = new Map([...importStateMap, ...checkReferenceOriginsResult.importStateMap]);

  // Validate references
  const validateReferencesResult = await validateReferences({
    objects: collectSavedObjectsResult.collectedObjects,
    savedObjectsClient,
    namespace,
    importStateMap,
    retries,
  });
  errorAccumulator = [...errorAccumulator, ...validateReferencesResult];

  if (createNewCopies) {
    // In case any missing reference errors were resolved, ensure that we regenerate those object IDs as well
    // This is because a retry to resolve a missing reference error may not necessarily specify a destinationId
    importStateMap = new Map([
      ...importStateMap, // preserve any entries for references that aren't included in collectedObjects
      ...regenerateIds(collectSavedObjectsResult.collectedObjects),
    ]);
  }

  // Check single-namespace objects for conflicts in this namespace, and check multi-namespace objects for conflicts across all namespaces
  const checkConflictsParams = {
    objects: collectSavedObjectsResult.collectedObjects,
    savedObjectsClient,
    namespace,
    retries,
    createNewCopies,
  };
  const checkConflictsResult = await checkConflicts(checkConflictsParams);
  errorAccumulator = [...errorAccumulator, ...checkConflictsResult.errors];
  importStateMap = new Map([...importStateMap, ...checkConflictsResult.importStateMap]);

  let originConflictsImportStateMap: ImportStateMap = new Map();
  if (!createNewCopies) {
    // If createNewCopies is *not* enabled, check multi-namespace object types for origin conflicts in this namespace
    const checkOriginConflictsParams = {
      objects: checkConflictsResult.filteredObjects,
      savedObjectsClient,
      typeRegistry,
      namespace,
      importStateMap,
      pendingOverwrites: checkConflictsResult.pendingOverwrites,
      retries,
    };
    const checkOriginConflictsResult = await checkOriginConflicts(checkOriginConflictsParams);
    errorAccumulator = [...errorAccumulator, ...checkOriginConflictsResult.errors];
    originConflictsImportStateMap = checkOriginConflictsResult.importStateMap;
  }

  // Check multi-namespace object types for regular conflicts and ambiguous conflicts
  const getImportStateMapForRetriesParams = {
    objects: checkConflictsResult.filteredObjects,
    retries,
    createNewCopies,
  };
  const importStateMapForRetries = getImportStateMapForRetries(getImportStateMapForRetriesParams);
  importStateMap = new Map([
    ...importStateMap,
    ...importStateMapForRetries,
    // the importStateMap entries from checkConflicts and checkOriginConflicts take precedence over the others
    ...checkConflictsResult.importStateMap,
    ...originConflictsImportStateMap,
  ]);

  // Bulk create in two batches, overwrites and non-overwrites
  let successResults: SavedObjectsImportSuccess[] = [];
  let successObjects: SavedObject[] = [];
  const accumulatedErrors = [...errorAccumulator];
  const bulkCreateObjects = async (
    objects: Array<SavedObject<{ title?: string }>>,
    overwrite?: boolean
  ) => {
    const createSavedObjectsParams = {
      objects,
      accumulatedErrors,
      savedObjectsClient,
      importStateMap,
      namespace,
      overwrite,
    };
    const { createdObjects, errors: bulkCreateErrors } = await createSavedObjects(
      createSavedObjectsParams
    );
    successObjects = [...successObjects, ...createdObjects];
    errorAccumulator = [...errorAccumulator, ...bulkCreateErrors];
    successCount += createdObjects.length;
    successResults = [
      ...successResults,
      ...createdObjects.map((createdObject) => {
        const { type, id, destinationId, originId } = createdObject;
        const getTitle = typeRegistry.getType(type)?.management?.getTitle;
        const meta = {
          title: getTitle ? getTitle(createdObject) : createdObject.attributes.title,
          icon: typeRegistry.getType(type)?.management?.icon,
        };
        return {
          type,
          id,
          meta,
          ...(overwrite && { overwrite }),
          ...(destinationId && { destinationId }),
          ...(destinationId && !originId && !createNewCopies && { createNewCopy: true }),
        };
      }),
    ];
  };
  const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites(
    collectSavedObjectsResult.collectedObjects,
    retries
  );
  await bulkCreateObjects(objectsToOverwrite, true);
  await bulkCreateObjects(objectsToNotOverwrite);

  const errorResults = errorAccumulator.map((error) => {
    const icon = typeRegistry.getType(error.type)?.management?.icon;
    const attemptedOverwrite = retries.some(
      ({ type, id, overwrite }) => type === error.type && id === error.id && overwrite
    );
    return {
      ...error,
      meta: { ...error.meta, icon },
      ...(attemptedOverwrite && { overwrite: true }),
    };
  });

  const warnings = await executeImportHooks({
    objects: successObjects,
    importHooks,
  });

  return {
    successCount,
    success: errorAccumulator.length === 0,
    warnings,
    ...(successResults.length && { successResults }),
    ...(errorResults.length && { errors: errorResults }),
  };
}
