/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CreatedObject, SavedObject } from '@kbn/core-saved-objects-server';
import { extractErrors } from './extract_errors';
import type { ImportStateMap } from './types';

export interface CreateSavedObjectsParams<T> {
  objects: Array<SavedObject<T>>;
  accumulatedErrors: SavedObjectsImportFailure[];
  savedObjectsClient: SavedObjectsClientContract;
  importStateMap: ImportStateMap;
  namespace?: string;
  overwrite?: boolean;
  refresh?: boolean | 'wait_for';
}

export interface CreateSavedObjectsResult<T> {
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
  importStateMap,
  namespace,
  overwrite,
  refresh,
}: CreateSavedObjectsParams<T>): Promise<CreateSavedObjectsResult<T>> => {
  // filter out any objects that resulted in errors
  const errorSet = accumulatedErrors.reduce(
    (acc, { type, id }) => acc.add(`${type}:${id}`),
    new Set<string>()
  );
  const filteredObjects = objects.filter(({ type, id }) => !errorSet.has(`${type}:${id}`));

  // exit early if there are no objects to create
  if (filteredObjects.length === 0) {
    return { createdObjects: [], errors: [] };
  }

  // generate a map of the raw object IDs
  const objectIdMap = filteredObjects.reduce(
    (map, object) => map.set(`${object.type}:${object.id}`, object),
    new Map<string, SavedObject<T>>()
  );

  // filter out the 'version' field of each object, if it exists, and set the originId appropriately
  const objectsToCreate = filteredObjects.map(({ version, originId, ...object }) => {
    // use the import ID map to ensure that each reference is being created with the correct ID
    const references = object.references?.map((reference) => {
      const { type, id } = reference;
      const importStateValue = importStateMap.get(`${type}:${id}`);
      if (importStateValue?.destinationId) {
        return { ...reference, id: importStateValue.destinationId };
      }
      return reference;
    });
    // use the import ID map to ensure that each object is being created with the correct ID, also ensure that the `originId` is set on
    // the created object if it did not have one (or is omitted if specified)
    const importStateValue = importStateMap.get(`${object.type}:${object.id}`);
    if (importStateValue?.destinationId) {
      objectIdMap.set(`${object.type}:${importStateValue.destinationId}`, object);
      return {
        ...object,
        id: importStateValue.destinationId,
        ...(references && { references }),
        // Do not set originId, not even to undefined, if omitOriginId is true.
        // When omitOriginId is true, we are trying to create a brand new object without setting the originId at all.
        // Semantically, setting `originId: undefined` is used to clear out an existing object's originId when overwriting it
        // (and if you attempt to do that on a non-multi-namespace object type, it will result in a 400 Bad Request error).
        ...(!importStateValue.omitOriginId && { originId: originId ?? object.id }),
      };
    }
    return { ...object, ...(references && { references }), ...(originId && { originId }) };
  });

  const resolvableErrors = ['conflict', 'ambiguous_conflict', 'missing_references'];
  let expectedResults = objectsToCreate;
  if (!accumulatedErrors.some(({ error: { type } }) => resolvableErrors.includes(type))) {
    const bulkCreateResponse = await savedObjectsClient.bulkCreate(objectsToCreate, {
      namespace,
      overwrite,
      refresh,
    });
    expectedResults = bulkCreateResponse.saved_objects;
  }

  // remap results to reflect the object IDs that were submitted for import
  // this ensures that consumers understand the results
  const remappedResults = expectedResults.map<CreatedObject<T>>((result) => {
    const { id } = objectIdMap.get(`${result.type}:${result.id}`)!;
    // also, include a `destinationId` field if the object create attempt was made with a different ID
    return { ...result, id, ...(id !== result.id && { destinationId: result.id }) };
  });

  return {
    createdObjects: remappedResults.filter((obj) => !obj.error),
    errors: extractErrors(remappedResults, objects),
  };
};
