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

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';

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
