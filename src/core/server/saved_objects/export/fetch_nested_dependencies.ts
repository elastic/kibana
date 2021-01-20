/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    objects: allObjects.filter((obj) => !obj.error),
    missingRefs: allObjects
      .filter((obj) => !!obj.error)
      .map((obj) => ({ type: obj.type, id: obj.id })),
  };
}

const objKey = (obj: { type: string; id: string }) => `${obj.type}:${obj.id}`;
