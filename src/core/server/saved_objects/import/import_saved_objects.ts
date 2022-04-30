/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { SavedObjectsClientContract } from '../types';
import {
  SavedObjectsImportFailure,
  SavedObjectsImportResponse,
  SavedObjectsImportHook,
} from './types';
import {
  checkReferenceOrigins,
  validateReferences,
  checkOriginConflicts,
  createSavedObjects,
  checkConflicts,
  regenerateIds,
  collectSavedObjects,
  executeImportHooks,
} from './lib';

/**
 * Options to control the import operation.
 */
export interface ImportSavedObjectsOptions {
  /** The stream of {@link SavedObject | saved objects} to import */
  readStream: Readable;
  /** The maximum number of object to import */
  objectLimit: number;
  /** If true, will override existing object if present. Note: this has no effect when used with the `createNewCopies` option. */
  overwrite: boolean;
  /** {@link SavedObjectsClientContract | client} to use to perform the import operation */
  savedObjectsClient: SavedObjectsClientContract;
  /** The registry of all known saved object types */
  typeRegistry: ISavedObjectTypeRegistry;
  /** List of registered import hooks */
  importHooks: Record<string, SavedObjectsImportHook[]>;
  /** if specified, will import in given namespace, else will import as global object */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
}

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
  importHooks,
  namespace,
}: ImportSavedObjectsOptions): Promise<SavedObjectsImportResponse> {
  let errorAccumulator: SavedObjectsImportFailure[] = [];
  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);

  // Get the objects to import
  const collectSavedObjectsResult = await collectSavedObjects({
    readStream,
    objectLimit,
    supportedTypes,
  });
  errorAccumulator = [...errorAccumulator, ...collectSavedObjectsResult.errors];
  // Map of all IDs for objects that we are attempting to import, and any references that are not included in the read stream;
  // each value is empty by default
  let importStateMap = collectSavedObjectsResult.importStateMap;
  let pendingOverwrites = new Set<string>();

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
  });
  errorAccumulator = [...errorAccumulator, ...validateReferencesResult];

  if (createNewCopies) {
    importStateMap = new Map([
      ...importStateMap, // preserve any entries for references that aren't included in collectedObjects
      ...regenerateIds(collectSavedObjectsResult.collectedObjects),
    ]);
  } else {
    // Check single-namespace objects for conflicts in this namespace, and check multi-namespace objects for conflicts across all namespaces
    const checkConflictsParams = {
      objects: collectSavedObjectsResult.collectedObjects,
      savedObjectsClient,
      namespace,
      ignoreRegularConflicts: overwrite,
    };
    const checkConflictsResult = await checkConflicts(checkConflictsParams);
    errorAccumulator = [...errorAccumulator, ...checkConflictsResult.errors];
    importStateMap = new Map([...importStateMap, ...checkConflictsResult.importStateMap]);
    pendingOverwrites = checkConflictsResult.pendingOverwrites;

    // Check multi-namespace object types for origin conflicts in this namespace
    const checkOriginConflictsParams = {
      objects: checkConflictsResult.filteredObjects,
      savedObjectsClient,
      typeRegistry,
      namespace,
      ignoreRegularConflicts: overwrite,
      importStateMap,
      pendingOverwrites,
    };
    const checkOriginConflictsResult = await checkOriginConflicts(checkOriginConflictsParams);
    errorAccumulator = [...errorAccumulator, ...checkOriginConflictsResult.errors];
    importStateMap = new Map([...importStateMap, ...checkOriginConflictsResult.importStateMap]);
    pendingOverwrites = new Set([
      ...pendingOverwrites,
      ...checkOriginConflictsResult.pendingOverwrites,
    ]);
  }

  // Create objects in bulk
  const createSavedObjectsParams = {
    objects: collectSavedObjectsResult.collectedObjects,
    accumulatedErrors: errorAccumulator,
    savedObjectsClient,
    importStateMap,
    overwrite,
    namespace,
  };
  const createSavedObjectsResult = await createSavedObjects(createSavedObjectsParams);
  errorAccumulator = [...errorAccumulator, ...createSavedObjectsResult.errors];

  const successResults = createSavedObjectsResult.createdObjects.map((createdObject) => {
    const { type, id, destinationId, originId } = createdObject;
    const getTitle = typeRegistry.getType(type)?.management?.getTitle;
    const meta = {
      title: getTitle ? getTitle(createdObject) : createdObject.attributes.title,
      icon: typeRegistry.getType(type)?.management?.icon,
    };
    const attemptedOverwrite = pendingOverwrites.has(`${type}:${id}`);
    return {
      type,
      id,
      meta,
      ...(attemptedOverwrite && { overwrite: true }),
      ...(destinationId && { destinationId }),
      ...(destinationId && !originId && !createNewCopies && { createNewCopy: true }),
    };
  });
  const errorResults = errorAccumulator.map((error) => {
    const icon = typeRegistry.getType(error.type)?.management?.icon;
    const attemptedOverwrite = pendingOverwrites.has(`${error.type}:${error.id}`);
    return {
      ...error,
      meta: { ...error.meta, icon },
      ...(attemptedOverwrite && { overwrite: true }),
    };
  });
  const warnings = await executeImportHooks({
    objects: createSavedObjectsResult.createdObjects,
    importHooks,
  });

  return {
    successCount: createSavedObjectsResult.createdObjects.length,
    success: errorAccumulator.length === 0,
    warnings,
    ...(successResults.length && { successResults }),
    ...(errorResults.length && { errors: errorResults }),
  };
}
