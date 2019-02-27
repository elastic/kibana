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
import { Readable } from 'stream';
import {
  createConcatStream,
  createFilterStream,
  createLimitStream,
  createMapStream,
  createPromiseFromStreams,
  createSplitStream,
} from '../../../utils/streams';
import { SavedObject, SavedObjectsClient } from '../service';

interface ImportSavedObjectsOptions {
  readStream: Readable;
  objectLimit: number;
  overwriteAll: boolean;
  savedObjectsClient: SavedObjectsClient;
  overwrites: Array<{
    type: string;
    id: string;
  }>;
  replaceReferences: Array<{
    type: string;
    from: string;
    to: string;
  }>;
  skips: Array<{
    type: string;
    id: string;
  }>;
}

async function collectSavedObjects(
  readStream: Readable,
  objectLimit: number
): Promise<SavedObject[]> {
  return await createPromiseFromStreams([
    readStream,
    createSplitStream('\n'),
    createMapStream((str: string) => {
      if (str && str !== '') {
        return JSON.parse(str);
      }
    }),
    createFilterStream<SavedObject>(obj => !!obj),
    createLimitStream(objectLimit),
    createConcatStream([]),
  ]);
}

function splitOverwrites(
  savedObjects: SavedObject[],
  overwriteAll: boolean,
  overwrites: Array<{
    type: string;
    id: string;
  }>,
  skips: Array<{
    type: string;
    id: string;
  }>
) {
  const objectsToOverwrite: SavedObject[] = [];
  const objectsToNotOverwrite: SavedObject[] = [];
  for (const savedObject of savedObjects) {
    if (skips.some(obj => obj.type === savedObject.type && obj.id === savedObject.id)) {
      continue;
    }
    if (
      overwriteAll === true ||
      overwrites.some(obj => obj.type === savedObject.type && obj.id === savedObject.id)
    ) {
      objectsToOverwrite.push(savedObject);
    } else {
      objectsToNotOverwrite.push(savedObject);
    }
  }
  return { objectsToOverwrite, objectsToNotOverwrite };
}

export async function importSavedObjects({
  readStream,
  objectLimit,
  skips,
  overwrites,
  overwriteAll,
  savedObjectsClient,
}: ImportSavedObjectsOptions) {
  const objectsToImport = await collectSavedObjects(readStream, objectLimit);
  const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites(
    objectsToImport,
    overwriteAll,
    overwrites,
    skips
  );

  // Overwrite objects
  if (objectsToOverwrite.length) {
    await savedObjectsClient.bulkCreate(objectsToOverwrite, { overwrite: true });
  }

  // Create other objects, detect collisions
  if (objectsToNotOverwrite.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToNotOverwrite);
    const failedObjects = bulkCreateResult.saved_objects.filter(obj => !!obj.error);
    if (failedObjects.length) {
      const err = Boom.conflict();
      // Boom's method to add data to the error
      err.output.payload.attributes = {
        objects: failedObjects.map(obj => ({ id: obj.id, type: obj.type })),
      };
      throw err;
    }
  }

  return { success: true };
}
