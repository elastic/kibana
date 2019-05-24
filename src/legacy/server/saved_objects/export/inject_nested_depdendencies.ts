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

import Boom from 'boom';
import { SavedObject, SavedObjectsClientContract } from '../service/saved_objects_client';

export function getObjectReferencesToFetch(savedObjectsMap: Map<string, SavedObject>) {
  const objectsToFetch = new Map<string, { type: string; id: string }>();
  for (const savedObject of savedObjectsMap.values()) {
    for (const { type, id } of savedObject.references || []) {
      if (!savedObjectsMap.has(`${type}:${id}`)) {
        objectsToFetch.set(`${type}:${id}`, { type, id });
      }
    }
  }
  return [...objectsToFetch.values()];
}

export async function injectNestedDependencies(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClientContract
) {
  const savedObjectsMap = new Map<string, SavedObject>();
  for (const savedObject of savedObjects) {
    savedObjectsMap.set(`${savedObject.type}:${savedObject.id}`, savedObject);
  }
  let objectsToFetch = getObjectReferencesToFetch(savedObjectsMap);
  while (objectsToFetch.length > 0) {
    const bulkGetResponse = await savedObjectsClient.bulkGet(objectsToFetch);
    // Check for errors
    const erroredObjects = bulkGetResponse.saved_objects.filter(obj => !!obj.error);
    if (erroredObjects.length) {
      const err = Boom.badRequest();
      err.output.payload.attributes = {
        objects: erroredObjects,
      };
      throw err;
    }
    // Push to array result
    for (const savedObject of bulkGetResponse.saved_objects) {
      savedObjectsMap.set(`${savedObject.type}:${savedObject.id}`, savedObject);
    }
    objectsToFetch = getObjectReferencesToFetch(savedObjectsMap);
  }
  return [...savedObjectsMap.values()];
}
