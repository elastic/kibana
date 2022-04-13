/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectsClientContract, SavedObjectsImportFailure } from '../../types';
import { extractErrors } from './extract_errors';
import { CreatedObject } from '../types';
import type { ImportStateMap } from './types';

export interface CreateSavedObjectsParams<T> {
  objects: Array<SavedObject<T>>;
  accumulatedErrors: SavedObjectsImportFailure[];
  savedObjectsClient: SavedObjectsClientContract;
  importStateMap: ImportStateMap;
  namespace?: string;
  overwrite?: boolean;
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

  // filter out the 'version' field of each object, if it exists
  const objectsToCreate = filteredObjects.map(({ version, ...object }) => {
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
      const originId = importStateValue.omitOriginId ? undefined : object.originId ?? object.id;
      return {
        ...object,
        id: importStateValue.destinationId,
        originId,
        ...(references && { references }),
      };
    }
    return { ...object, ...(references && { references }) };
  });

  const resolvableErrors = ['conflict', 'ambiguous_conflict', 'missing_references'];
  let expectedResults = objectsToCreate;
  if (!accumulatedErrors.some(({ error: { type } }) => resolvableErrors.includes(type))) {
    const bulkCreateResponse = await savedObjectsClient.bulkCreate(objectsToCreate, {
      namespace,
      overwrite,
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
