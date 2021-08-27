/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectsClientContract, SavedObjectsImportFailure } from '../../types';
import { getObjKey } from '../../service/lib';
import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { extractErrors } from './extract_errors';
import { CreatedObject } from '../types';

interface CreateSavedObjectsParams<T> {
  objects: Array<SavedObject<T>>;
  accumulatedErrors: SavedObjectsImportFailure[];
  savedObjectsClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  importIdMap: Map<string, { id?: string; omitOriginId?: boolean }>;
  importNamespaces: boolean;
  namespace?: string;
  overwrite?: boolean;
}

interface CreateSavedObjectsResult<T> {
  createdObjects: Array<CreatedObject<T>>;
  errors: SavedObjectsImportFailure[];
}

/**
 * This function abstracts the bulk creation of import objects. The main reason for this is that the import ID map should dictate the IDs of
 * the objects we create, and the create results should be mapped to the original IDs that consumers will be able to understand.
 */
export const createSavedObjects = async <T>({
  objects,
  accumulatedErrors,
  savedObjectsClient,
  typeRegistry,
  importIdMap,
  importNamespaces,
  namespace,
  overwrite,
}: CreateSavedObjectsParams<T>): Promise<CreateSavedObjectsResult<T>> => {
  // filter out any objects that resulted in errors
  const errorSet = accumulatedErrors.reduce(
    (acc, obj) => acc.add(getObjKey(obj, typeRegistry, namespace)),
    new Set<string>()
  );
  const filteredObjects = objects.filter(
    (obj) => !errorSet.has(getObjKey(obj, typeRegistry, namespace))
  );

  // exit early if there are no objects to create
  if (filteredObjects.length === 0) {
    return { createdObjects: [], errors: [] };
  }

  // generate a map of the raw object IDs
  const objectIdMap = filteredObjects.reduce(
    (map, object) => map.set(getObjKey(object, typeRegistry, namespace), object),
    new Map<string, SavedObject<T>>()
  );

  // filter out the 'version' field of each object, if it exists
  const objectsToCreate = filteredObjects.map(({ version, ...object }) => {
    // use the import ID map to ensure that each reference is being created with the correct ID
    const references = object.references?.map((reference) => {
      const { type, id } = reference;
      const importIdEntry = importIdMap.get(
        getObjKey(
          {
            type,
            id,
            namespaces: object.namespaces,
          },
          typeRegistry,
          namespace
        )
      );
      if (importIdEntry?.id) {
        return { ...reference, id: importIdEntry.id };
      }
      return reference;
    });
    // use the import ID map to ensure that each object is being created with the correct ID, also ensure that the `originId` is set on
    // the created object if it did not have one (or is omitted if specified)
    const importIdEntry = importIdMap.get(getObjKey(object, typeRegistry, namespace));
    if (importIdEntry?.id) {
      objectIdMap.set(
        getObjKey({ ...object, id: importIdEntry.id }, typeRegistry, namespace),
        object
      );
      const originId = importIdEntry.omitOriginId ? undefined : object.originId ?? object.id;
      return { ...object, id: importIdEntry.id, originId, ...(references && { references }) };
    }
    return { ...object, ...(references && { references }) };
  });

  const resolvableErrors = ['conflict', 'ambiguous_conflict', 'missing_references'];
  let expectedResults = objectsToCreate;
  if (!accumulatedErrors.some(({ error: { type } }) => resolvableErrors.includes(type))) {
    const bulkCreateResponse = await savedObjectsClient.bulkCreate(
      objectsToCreate.map(({ namespaces, ...obj }) => ({
        ...obj,
        ...(namespaces && importNamespaces ? { initialNamespaces: namespaces } : {}),
      })),
      {
        namespace,
        overwrite,
      }
    );
    expectedResults = bulkCreateResponse.saved_objects;
  }

  // remap results to reflect the object IDs that were submitted for import
  // this ensures that consumers understand the results
  const remappedResults = expectedResults.map<CreatedObject<T>>((result) => {
    // the (non-agnostic) created objects will always have a `namespaces` field populated is spaces is enabled,
    // but the keys we're using in rest of the algorithm don't have it, so in that case, we exclude the namespaces
    // when generating the remapping key.
    const resultKey = getObjKey(
      importNamespaces
        ? result
        : {
            ...result,
            namespaces: undefined,
          },
      typeRegistry,
      namespace
    );

    const { id } = objectIdMap.get(resultKey)!;
    // also, include a `destinationId` field if the object create attempt was made with a different ID
    return {
      ...result,
      id,
      ...(id !== result.id && { destinationId: result.id }),
    };
  });

  return {
    createdObjects: remappedResults.filter((obj) => !obj.error),
    errors: extractErrors(remappedResults, objects, typeRegistry, namespace),
  };
};
