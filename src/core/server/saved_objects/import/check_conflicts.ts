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

import { v4 as uuidv4 } from 'uuid';
import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsImportError,
  SavedObjectError,
  SavedObjectsImportRetry,
} from '../types';

interface CheckConflictsParams {
  objects: Array<SavedObject<{ title?: string }>>;
  savedObjectsClient: SavedObjectsClientContract;
  namespace?: string;
  ignoreRegularConflicts?: boolean;
  retries?: SavedObjectsImportRetry[];
  createNewCopies?: boolean;
}

const isUnresolvableConflict = (error: SavedObjectError) =>
  error.statusCode === 409 && error.metadata?.isNotOverwritable;

export async function checkConflicts({
  objects,
  savedObjectsClient,
  namespace,
  ignoreRegularConflicts,
  retries = [],
  createNewCopies,
}: CheckConflictsParams) {
  const filteredObjects: Array<SavedObject<{ title?: string }>> = [];
  const errors: SavedObjectsImportError[] = [];
  const importIdMap = new Map<string, { id?: string; omitOriginId?: boolean }>();
  const pendingOverwrites = new Set<string>();

  // exit early if there are no objects to check
  if (objects.length === 0) {
    return { filteredObjects, errors, importIdMap, pendingOverwrites };
  }

  const retryMap = retries.reduce(
    (acc, cur) => acc.set(`${cur.type}:${cur.id}`, cur),
    new Map<string, SavedObjectsImportRetry>()
  );
  const objectsToCheck = objects.map((x) => {
    const id = retryMap.get(`${x.type}:${x.id}`)?.destinationId ?? x.id;
    return { ...x, id };
  });
  const checkConflictsResult = await savedObjectsClient.checkConflicts(objectsToCheck, {
    namespace,
  });
  const errorMap = checkConflictsResult.errors.reduce(
    (acc, { type, id, error }) => acc.set(`${type}:${id}`, error),
    new Map<string, SavedObjectError>()
  );

  objects.forEach((object) => {
    const {
      type,
      id,
      attributes: { title },
    } = object;
    const { destinationId, overwrite, createNewCopy } = retryMap.get(`${type}:${id}`) || {};
    const errorObj = errorMap.get(`${type}:${destinationId ?? id}`);
    if (errorObj && isUnresolvableConflict(errorObj)) {
      // Any object create attempt that would result in an unresolvable conflict should have its ID regenerated. This way, when an object
      // with a "multi-namespace" type is exported from one namespace and imported to another, it does not result in an error, but instead a
      // new object is created.
      // This code path should not be triggered for a retry, but in case the consumer is using the import APIs incorrectly and attempting to
      // retry an object with a destinationId that would result in an unresolvable conflict, we regenerate the ID here as a fail-safe.
      const omitOriginId = createNewCopies || createNewCopy;
      importIdMap.set(`${type}:${id}`, { id: uuidv4(), omitOriginId });
      filteredObjects.push(object);
    } else if (errorObj && errorObj.statusCode !== 409) {
      errors.push({ type, id, title, meta: { title }, error: { ...errorObj, type: 'unknown' } });
    } else if (errorObj?.statusCode === 409 && !ignoreRegularConflicts && !overwrite) {
      const error = { type: 'conflict' as 'conflict', ...(destinationId && { destinationId }) };
      errors.push({ type, id, title, meta: { title }, error });
    } else {
      filteredObjects.push(object);
      if (errorObj?.statusCode === 409) {
        pendingOverwrites.add(`${type}:${id}`);
      }
    }
  });
  return { filteredObjects, errors, importIdMap, pendingOverwrites };
}
