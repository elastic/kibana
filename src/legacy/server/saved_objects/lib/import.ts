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
import { Readable, Transform } from 'stream';
import {
  createConcatStream,
  createFilterStream,
  createMapStream,
  createPromiseFromStreams,
  createSplitStream,
} from '../../../utils/streams';
import { SavedObject, SavedObjectsClient } from '../service';

interface CustomError {
  id: string;
  type: string;
  error: {
    message: string;
    statusCode: number;
  };
}

interface ImportResponse {
  success: boolean;
  successCount: number;
  errors?: CustomError[];
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
        id: savedObject.id,
        type: savedObject.type,
        error: savedObject.error,
      });
    }
  }
  return errors;
}

export function createLimitStream(limit: number) {
  let counter = 0;
  return new Transform({
    objectMode: true,
    async transform(obj, enc, done) {
      if (counter >= limit) {
        return done(Boom.badRequest(`Can't import more than ${limit} objects`));
      }
      counter++;
      done(undefined, obj);
    },
  });
}

export async function collectSavedObjects(
  readStream: Readable,
  objectLimit: number,
  filter?: (obj: SavedObject) => boolean
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
    createFilterStream<SavedObject>(obj => (filter ? filter(obj) : true)),
    createConcatStream([]),
  ])) as SavedObject[];
}

export function createObjectsFilter(
  skips: Array<{
    type: string;
    id: string;
  }>,
  overwrites: Array<{
    type: string;
    id: string;
  }>,
  replaceReferences: Array<{
    type: string;
    from: string;
    to: string;
  }>
) {
  const refReplacements = replaceReferences.map(ref => `${ref.type}:${ref.from}`);
  return (obj: SavedObject) => {
    if (skips.some(skipObj => skipObj.type === obj.type && skipObj.id === obj.id)) {
      return false;
    }
    if (
      overwrites.some(overwriteObj => overwriteObj.type === obj.type && overwriteObj.id === obj.id)
    ) {
      return true;
    }
    for (const reference of obj.references || []) {
      if (refReplacements.includes(`${reference.type}:${reference.id}`)) {
        return true;
      }
    }
    return false;
  };
}

export async function importSavedObjects({
  readStream,
  objectLimit,
  overwrite,
  savedObjectsClient,
}: ImportSavedObjectsOptions): Promise<ImportResponse> {
  const objectsToImport = await collectSavedObjects(readStream, objectLimit);

  if (objectsToImport.length === 0) {
    return {
      success: true,
      successCount: 0,
    };
  }

  const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToImport, {
    overwrite,
  });
  const errors = extractErrors(bulkCreateResult.saved_objects);

  return {
    success: errors.length === 0,
    successCount: objectsToImport.length - errors.length,
    ...(errors.length ? { errors } : {}),
  };
}

export async function resolveImportConflicts({
  readStream,
  objectLimit,
  skips,
  overwrites,
  savedObjectsClient,
  replaceReferences,
}: ResolveImportConflictsOptions): Promise<ImportResponse> {
  let errors: CustomError[] = [];
  const filter = createObjectsFilter(skips, overwrites, replaceReferences);
  const objectsToResolve = await collectSavedObjects(readStream, objectLimit, filter);

  // Replace references
  const refReplacementsMap: Record<string, string> = {};
  for (const { type, to, from } of replaceReferences) {
    refReplacementsMap[`${type}:${from}`] = to;
  }
  for (const savedObject of objectsToResolve) {
    for (const reference of savedObject.references || []) {
      if (refReplacementsMap[`${reference.type}:${reference.id}`]) {
        reference.id = refReplacementsMap[`${reference.type}:${reference.id}`];
      }
    }
  }

  if (objectsToResolve.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToResolve, {
      overwrite: true,
    });
    errors = extractErrors(bulkCreateResult.saved_objects);
  }

  return {
    success: errors.length === 0,
    successCount: objectsToResolve.length - errors.length,
    ...(errors.length ? { errors } : {}),
  };
}
