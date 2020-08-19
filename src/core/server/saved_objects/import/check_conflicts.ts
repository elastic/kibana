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
} from '../types';

interface CheckConflictsParams {
  objects: Array<SavedObject<{ title?: string }>>;
  savedObjectsClient: SavedObjectsClientContract;
  namespace?: string;
  ignoreRegularConflicts?: boolean;
  createNewCopies?: boolean;
}

const isUnresolvableConflict = (error: SavedObjectError) =>
  error.statusCode === 409 && error.metadata?.isNotOverwritable;

export async function checkConflicts({
  objects,
  savedObjectsClient,
  namespace,
  ignoreRegularConflicts,
  createNewCopies,
}: CheckConflictsParams) {
  const filteredObjects: Array<SavedObject<{ title?: string }>> = [];
  const errors: SavedObjectsImportError[] = [];
  const importIdMap = new Map<string, { id?: string; omitOriginId?: boolean }>();

  // exit early if there are no objects to check
  if (objects.length === 0) {
    return { filteredObjects, errors, importIdMap };
  }

  const checkConflictsResult = await savedObjectsClient.checkConflicts(objects, { namespace });
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
    const errorObj = errorMap.get(`${type}:${id}`);
    if (errorObj && isUnresolvableConflict(errorObj)) {
      // Any object create attempt that would result in an unresolvable conflict should have its ID regenerated. This way, when an object
      // with a "multi-namespace" type is exported from one namespace and imported to another, it does not result in an error, but instead a
      // new object is created.
      const destinationId = uuidv4();
      importIdMap.set(`${type}:${id}`, { id: destinationId, omitOriginId: createNewCopies });
      filteredObjects.push(object);
    } else if (errorObj && errorObj.statusCode !== 409) {
      errors.push({ type, id, title, error: { ...errorObj, type: 'unknown' } });
    } else if (errorObj?.statusCode === 409 && !ignoreRegularConflicts) {
      errors.push({ type, id, title, error: { type: 'conflict' } });
    } else {
      filteredObjects.push(object);
    }
  });
  return { filteredObjects, errors, importIdMap };
}
