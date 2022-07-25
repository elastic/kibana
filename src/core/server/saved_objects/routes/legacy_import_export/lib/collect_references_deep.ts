/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectsClientContract } from '../../../..';

const MAX_BULK_GET_SIZE = 10000;

interface ObjectsToCollect {
  id: string;
  type: string;
}

export async function collectReferencesDeep(
  savedObjectClient: SavedObjectsClientContract,
  objects: ObjectsToCollect[]
): Promise<SavedObject[]> {
  let result: SavedObject[] = [];
  const queue = [...objects];
  while (queue.length !== 0) {
    const itemsToGet = queue.splice(0, MAX_BULK_GET_SIZE);
    const { saved_objects: savedObjects } = await savedObjectClient.bulkGet(itemsToGet);
    result = result.concat(savedObjects);
    for (const { references = [] } of savedObjects) {
      for (const reference of references) {
        const isDuplicate = queue
          .concat(result)
          .some((obj) => obj.type === reference.type && obj.id === reference.id);
        if (isDuplicate) {
          continue;
        }
        queue.push({ type: reference.type, id: reference.id });
      }
    }
  }
  return result;
}
