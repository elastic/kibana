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
  validateReferences,
  checkOriginConflicts,
  createSavedObjects,
  checkConflicts,
  regenerateIds,
  collectSavedObjects,
  executeImportHooks,
  getObjectKeyProvider,
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
  /** If true, the namespaces of the objects from the import file will be imported. Defaults to false. */
  importNamespaces: boolean;
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
  importNamespaces,
}: ImportSavedObjectsOptions): Promise<SavedObjectsImportResponse> {
  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);

  let errorAccumulator: SavedObjectsImportFailure[] = [];

  const getObjKey = getObjectKeyProvider({
    typeRegistry,
    namespace,
    useObjectNamespaces: importNamespaces,
    useProvidedNamespace: namespace !== undefined,
  });

  // Get the objects to import
  const collectSavedObjectsResult = await collectSavedObjects({
    readStream,
    objectLimit,
    supportedTypes,
    getObjKey,
  });
  errorAccumulator = [...errorAccumulator, ...collectSavedObjectsResult.errors];

  // validate the presence of namespaces or not depending on `importNamespaces`
  // TODO (?)

  /** Map of all IDs for objects that we are attempting to import; each value is empty by default */
  let importIdMap = collectSavedObjectsResult.importIdMap;
  let pendingOverwrites = new Set<string>();

  // Validate references
  const validateReferencesResult = await validateReferences({
    savedObjects: collectSavedObjectsResult.collectedObjects,
    savedObjectsClient,
    getObjKey,
    namespace,
  });
  errorAccumulator = [...errorAccumulator, ...validateReferencesResult];

  if (createNewCopies) {
    importIdMap = regenerateIds({
      objects: collectSavedObjectsResult.collectedObjects,
      getObjKey,
    });
  } else {
    // Check single-namespace objects for conflicts in this namespace, and check multi-namespace objects for conflicts across all namespaces
    const checkConflictsResult = await checkConflicts({
      objects: collectSavedObjectsResult.collectedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
      ignoreRegularConflicts: overwrite,
    });
    errorAccumulator = [...errorAccumulator, ...checkConflictsResult.errors];
    importIdMap = new Map([...importIdMap, ...checkConflictsResult.importIdMap]);
    pendingOverwrites = checkConflictsResult.pendingOverwrites;

    // Check multi-namespace object types for origin conflicts in this namespace
    const checkOriginConflictsResult = await checkOriginConflicts({
      objects: checkConflictsResult.filteredObjects,
      savedObjectsClient,
      getObjKey,
      typeRegistry,
      namespace,
      ignoreRegularConflicts: overwrite,
      importIdMap,
    });
    errorAccumulator = [...errorAccumulator, ...checkOriginConflictsResult.errors];
    importIdMap = new Map([...importIdMap, ...checkOriginConflictsResult.importIdMap]);
    pendingOverwrites = new Set([
      ...pendingOverwrites,
      ...checkOriginConflictsResult.pendingOverwrites,
    ]);
  }

  // Create objects in bulk
  const createSavedObjectsResult = await createSavedObjects({
    objects: collectSavedObjectsResult.collectedObjects,
    accumulatedErrors: errorAccumulator,
    savedObjectsClient,
    getObjKey,
    importIdMap,
    overwrite,
    namespace,
    importNamespaces,
  });
  errorAccumulator = [...errorAccumulator, ...createSavedObjectsResult.errors];

  const successResults = createSavedObjectsResult.createdObjects.map((createdObject) => {
    const { type, id, destinationId, originId, namespaces } = createdObject;
    const objectType = typeRegistry.getType(type)!;
    const getTitle = objectType.management?.getTitle;
    const meta = {
      title: getTitle ? getTitle(createdObject) : createdObject.attributes.title,
      icon: objectType.management?.icon,
      namespaceType: objectType.namespaceType,
    };
    const attemptedOverwrite = pendingOverwrites.has(getObjKey(createdObject));
    return {
      type,
      id,
      meta,
      ...(importNamespaces && { namespaces }),
      ...(attemptedOverwrite && { overwrite: true }),
      ...(destinationId && { destinationId }),
      ...(destinationId && !originId && !createNewCopies && { createNewCopy: true }),
    };
  });
  const errorResults = errorAccumulator.map((error) => {
    const icon = typeRegistry.getType(error.type)?.management?.icon;
    const namespaceType = typeRegistry.getType(error.type)?.namespaceType;
    const attemptedOverwrite = pendingOverwrites.has(getObjKey(error));
    return {
      ...error,
      namespaces: importNamespaces ? error.namespaces : undefined,
      meta: { ...error.meta, icon, namespaceType },
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
