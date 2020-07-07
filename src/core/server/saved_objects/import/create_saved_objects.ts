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

import { SavedObject, SavedObjectsClientContract, SavedObjectsImportError } from '../types';
import { extractErrors } from './extract_errors';
import { CreatedObject } from './types';

interface CreateSavedObjectsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  importIdMap: Map<string, { id?: string; omitOriginId?: boolean }>;
  namespace?: string;
  overwrite?: boolean;
}
interface CreateSavedObjectsResult<T> {
  createdObjects: Array<CreatedObject<T>>;
  errors: SavedObjectsImportError[];
}

/**
 * This function abstracts the bulk creation of import objects. The main reason for this is that the import ID map should dictate the IDs of
 * the objects we create, and the create results should be mapped to the original IDs that consumers will be able to understand.
 */
export const createSavedObjects = async <T>(
  objects: Array<SavedObject<T>>,
  accumulatedErrors: SavedObjectsImportError[],
  options: CreateSavedObjectsOptions
): Promise<CreateSavedObjectsResult<T>> => {
  // exit early if there are no objects to create
  if (objects.length === 0) {
    return { createdObjects: [], errors: [] };
  }

  const { savedObjectsClient, importIdMap, namespace, overwrite } = options;

  // generate a map of the raw object IDs
  const objectIdMap = objects.reduce(
    (map, object) => map.set(`${object.type}:${object.id}`, object),
    new Map<string, SavedObject<T>>()
  );

  const objectsToCreate = objects.map((object) => {
    // use the import ID map to ensure that each reference is being created with the correct ID
    const references = object.references?.map((reference) => {
      const { type, id } = reference;
      const importIdEntry = importIdMap.get(`${type}:${id}`);
      if (importIdEntry?.id) {
        return { ...reference, id: importIdEntry.id };
      }
      return reference;
    });
    // use the import ID map to ensure that each object is being created with the correct ID, also ensure that the `originId` is set on
    // the created object if it did not have one (or is omitted if specified)
    const importIdEntry = importIdMap.get(`${object.type}:${object.id}`);
    if (importIdEntry?.id) {
      objectIdMap.set(`${object.type}:${importIdEntry.id}`, object);
      const originId = importIdEntry.omitOriginId ? undefined : object.originId ?? object.id;
      return { ...object, id: importIdEntry.id, originId, ...(references && { references }) };
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
