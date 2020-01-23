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

import { SavedObject, SavedObjectsClientContract } from '../types';

export function getObjectReferencesToFetch(savedObjectsMap: Map<string, SavedObject>) {
  const objectsToFetch = new Map<string, { type: string; id: string }>();
  for (const savedObject of savedObjectsMap.values()) {
    for (const ref of savedObject.references || []) {
      if (!savedObjectsMap.has(objKey(ref))) {
        objectsToFetch.set(objKey(ref), { type: ref.type, id: ref.id });
      }
    }
  }
  return [...objectsToFetch.values()];
}

export async function fetchNestedDependencies(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClientContract,
  namespace?: string
) {
  const savedObjectsMap = new Map<string, SavedObject>();
  for (const savedObject of savedObjects) {
    savedObjectsMap.set(objKey(savedObject), savedObject);
  }
  let objectsToFetch = getObjectReferencesToFetch(savedObjectsMap);
  while (objectsToFetch.length > 0) {
    const bulkGetResponse = await savedObjectsClient.bulkGet(objectsToFetch, { namespace });
    // Push to array result
    for (const savedObject of bulkGetResponse.saved_objects) {
      savedObjectsMap.set(objKey(savedObject), savedObject);
    }
    objectsToFetch = getObjectReferencesToFetch(savedObjectsMap);
  }
  const allObjects = [...savedObjectsMap.values()];
  return {
    objects: allObjects.filter(obj => !obj.error),
    missingRefs: allObjects.filter(obj => !!obj.error).map(obj => ({ type: obj.type, id: obj.id })),
  };
}

const objKey = (obj: { type: string; id: string }) => `${obj.type}:${obj.id}`;
