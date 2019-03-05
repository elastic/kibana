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

interface CustomError {
  message: string;
  statusCode: number;
  id: string;
  type: string;
}

interface ImportSavedObjectsOptions {
  readStream: Readable;
  objectLimit: number;
  overwrite: boolean;
  savedObjectsClient: SavedObjectsClient;
}

interface ResolveImportConflictsOptions {
  readStream: Readable;
  objectLimit: number;
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

export function extractErrors(savedObjects: SavedObject[]) {
  const errors: CustomError[] = [];
  for (const savedObject of savedObjects) {
    if (savedObject.error) {
      errors.push({
        ...savedObject.error,
        id: savedObject.id,
        type: savedObject.type,
      });
    }
  }
  return errors;
}

export async function collectSavedObjects(
  readStream: Readable,
  objectLimit: number
): Promise<SavedObject[]> {
  return (await createPromiseFromStreams([
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
  ])) as SavedObject[];
}

export function splitOverwrites(
  savedObjects: SavedObject[],
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
    if (overwrites.some(obj => obj.type === savedObject.type && obj.id === savedObject.id)) {
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
  overwrite,
  savedObjectsClient,
}: ImportSavedObjectsOptions): Promise<{
  success: boolean;
  errors?: CustomError[];
  successCount: number;
}> {
  const errors: CustomError[] = [];
  const objectsToImport = await collectSavedObjects(readStream, objectLimit);

  if (objectsToImport.length === 0) {
    return {
      success: true,
      successCount: 0,
    };
  }

  if (overwrite) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToImport, {
      overwrite: true,
    });
    errors.push(...extractErrors(bulkCreateResult.saved_objects));
  } else {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToImport);
    errors.push(...extractErrors(bulkCreateResult.saved_objects));
  }

  return {
    success: errors.length === 0,
    successCount: objectsToImport.length - errors.length,
    ...(errors.length ? { errors } : []),
  };
}

export async function resolveImportConflicts({
  readStream,
  objectLimit,
  skips,
  overwrites,
  savedObjectsClient,
  replaceReferences,
}: ResolveImportConflictsOptions): Promise<{
  success: boolean;
  errors?: CustomError[];
}> {
  const errors: CustomError[] = [];
  const objectsToImport = await collectSavedObjects(readStream, objectLimit);

  // Replace references
  for (const referenceToReplace of replaceReferences) {
    for (const savedObject of objectsToImport) {
      for (const reference of savedObject.references || []) {
        if (
          reference.type === referenceToReplace.type &&
          reference.id === referenceToReplace.from
        ) {
          reference.id = referenceToReplace.to;
        }
      }
    }
  }

  const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites(
    objectsToImport,
    overwrites,
    skips
  );

  // Overwrite objects
  if (objectsToOverwrite.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToOverwrite, {
      overwrite: true,
    });
    errors.push(...extractErrors(bulkCreateResult.saved_objects));
  }

  // Create other objects, detect collisions
  if (objectsToNotOverwrite.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToNotOverwrite);
    errors.push(...extractErrors(bulkCreateResult.saved_objects));
  }

  return {
    success: errors.length === 0,
    ...(errors.length ? { errors } : []),
  };
}
