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
import { getObjectKeyProvider } from './lib';
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
  validateReferences,
  validateRetries,
  createSavedObjects,
  getImportIdMapForRetries,
  checkConflicts,
  executeImportHooks,
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
  /**
   * TODO: doc
   * Defaults to false.
   *
   * Remarks: the stream of document will be validated accordingly
   */
  importNamespaces?: boolean;
}

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
  importHooks,
  namespace,
  importNamespaces = false,
  createNewCopies,
}: ResolveSavedObjectsImportErrorsOptions): Promise<SavedObjectsImportResponse> {
  const getObjKey = getObjectKeyProvider({
    typeRegistry,
    namespace,
    useObjectNamespaces: importNamespaces,
    useProvidedNamespace: namespace !== undefined,
  });

  // throw a BadRequest error if we see invalid retries
  validateRetries(retries, getObjKey);

  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);

  let successCount = 0;
  let errorAccumulator: SavedObjectsImportFailure[] = [];
  let importIdMap: Map<string, { id?: string; omitOriginId?: boolean }> = new Map();
  const filter = createObjectsFilter(retries, getObjKey);

  // Get the objects to resolve errors
  const { errors: collectorErrors, collectedObjects: objectsToResolve } = await collectSavedObjects(
    {
      readStream,
      objectLimit,
      filter,
      getObjKey,
      supportedTypes,
    }
  );
  errorAccumulator = [...errorAccumulator, ...collectorErrors];

  // Create a map of references to replace for each object to avoid iterating through
  // retries for every object to resolve
  const retriesReferencesMap = new Map<string, Record<string, string>>();
  for (const retry of retries) {
    const map: Record<string, string> = {};
    for (const { type, from, to } of retry.replaceReferences) {
      map[getObjKey({ type, id: from, namespaces: retry.namespaces })] = to;
    }
    retriesReferencesMap.set(getObjKey(retry), map);
  }

  // Replace references
  for (const savedObject of objectsToResolve) {
    const refMap = retriesReferencesMap.get(getObjKey(savedObject));
    if (!refMap) {
      continue;
    }
    for (const reference of savedObject.references || []) {
      const refKey = getObjKey({ ...reference, namespaces: savedObject.namespaces });
      if (refMap[refKey]) {
        reference.id = refMap[refKey];
      }
    }
  }

  // Validate references
  const validateReferencesResult = await validateReferences({
    savedObjects: objectsToResolve,
    savedObjectsClient,
    getObjKey,
    namespace,
    retries,
  });
  errorAccumulator = [...errorAccumulator, ...validateReferencesResult];

  if (createNewCopies) {
    // In case any missing reference errors were resolved, ensure that we regenerate those object IDs as well
    // This is because a retry to resolve a missing reference error may not necessarily specify a destinationId
    importIdMap = regenerateIds({
      objects: objectsToResolve,
      getObjKey,
    });
  }

  // Check single-namespace objects for conflicts in this namespace, and check multi-namespace objects for conflicts across all namespaces
  const checkConflictsResult = await checkConflicts({
    objects: objectsToResolve,
    savedObjectsClient,
    getObjKey,
    namespace,
    retries,
    createNewCopies,
  });
  errorAccumulator = [...errorAccumulator, ...checkConflictsResult.errors];

  // Check multi-namespace object types for regular conflicts and ambiguous conflicts
  const importIdMapForRetries = getImportIdMapForRetries({
    objects: checkConflictsResult.filteredObjects,
    retries,
    createNewCopies,
    getObjKey,
  });
  importIdMap = new Map([
    ...importIdMap,
    ...importIdMapForRetries,
    ...checkConflictsResult.importIdMap, // this importIdMap takes precedence over the others
  ]);

  // Bulk create in two batches, overwrites and non-overwrites
  let successResults: SavedObjectsImportSuccess[] = [];
  let successObjects: SavedObject[] = [];
  const accumulatedErrors = [...errorAccumulator];
  const bulkCreateObjects = async (
    objects: Array<SavedObject<{ title?: string }>>,
    overwrite?: boolean
  ) => {
    const { createdObjects, errors: bulkCreateErrors } = await createSavedObjects({
      objects,
      accumulatedErrors,
      savedObjectsClient,
      getObjKey,
      importIdMap,
      namespace,
      overwrite,
      importNamespaces,
    });
    successObjects = [...successObjects, ...createdObjects];
    errorAccumulator = [...errorAccumulator, ...bulkCreateErrors];
    successCount += createdObjects.length;
    successResults = [
      ...successResults,
      ...createdObjects.map((createdObject) => {
        const { type, id, namespaces, destinationId, originId } = createdObject;
        const getTitle = typeRegistry.getType(type)?.management?.getTitle;
        const meta = {
          title: getTitle ? getTitle(createdObject) : createdObject.attributes.title,
          icon: typeRegistry.getType(type)?.management?.icon,
        };
        return {
          type,
          id,
          namespaces,
          meta,
          ...(overwrite && { overwrite }),
          ...(destinationId && { destinationId }),
          ...(destinationId && !originId && !createNewCopies && { createNewCopy: true }),
        };
      }),
    ];
  };
  const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites({
    savedObjects: objectsToResolve,
    retries,
    getObjKey,
  });
  await bulkCreateObjects(objectsToOverwrite, true);
  await bulkCreateObjects(objectsToNotOverwrite);

  const errorResults = errorAccumulator.map((error) => {
    const icon = typeRegistry.getType(error.type)?.management?.icon;
    const attemptedOverwrite = retries.some(
      ({ overwrite, ...retry }) => getObjKey(retry) === getObjKey(error) && overwrite
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
