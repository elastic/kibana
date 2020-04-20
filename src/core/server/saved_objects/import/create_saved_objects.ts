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

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { v4 as uuidv4 } from 'uuid';
import { SavedObject, SavedObjectsClientContract } from '../types';

interface CreateSavedObjectsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  namespace?: string;
  overwrite?: boolean;
}

type UnresolvableConflict<T> = { retryIndex: number; retryObject: SavedObject<T> };
type Left<T> = { tag: 'left'; value: UnresolvableConflict<T> };
type Right<T> = { tag: 'right'; value: SavedObject<T> };
type Either<T> = Left<T> | Right<T>;
const isLeft = <T>(object: Either<T>): object is Left<T> => object.tag === 'left';
const isRight = <T>(object: Either<T>): object is Right<T> => object.tag === 'right';

const isUnresolvableConflict = (object: SavedObject<unknown>) =>
  object.error?.statusCode === 409 && object.error?.metadata?.isNotOverwriteable;

export const createSavedObjects = async <T>(
  objects: Array<SavedObject<T>>,
  options: CreateSavedObjectsOptions
) => {
  const { savedObjectsClient, namespace, overwrite } = options;

  // generate a map of the raw object IDs
  const objectIdMap = objects.reduce(
    (map, object) => map.set(`${object.type}:${object.id}`, object),
    new Map<string, SavedObject<T>>()
  );

  const bulkCreateResponse = await savedObjectsClient.bulkCreate(objects, {
    namespace,
    overwrite,
  });

  // retry bulkCreate for multi-namespace saved objects that had an unresolvable conflict
  // note: by definition, only multi-namespace saved objects can have an unresolavable conflict
  let retryIndexCounter = 0;
  const bulkCreateResults: Array<Either<T>> = bulkCreateResponse.saved_objects.map(result => {
    const object = objectIdMap.get(`${result.type}:${result.id}`)!;
    if (isUnresolvableConflict(result)) {
      const id = uuidv4();
      const originId = object.originId || object.id;
      const retryObject = { ...object, id, originId };
      objectIdMap.set(`${retryObject.type}:${retryObject.id}`, object);
      return { tag: 'left', value: { retryIndex: retryIndexCounter++, retryObject } };
    }
    return { tag: 'right', value: result };
  });

  const retries = bulkCreateResults.filter(isLeft).map(x => x.value.retryObject);
  let retryResults: Array<SavedObject<T> & { regeneratedId: string }> = [];
  if (retries.length > 0) {
    const retryResponse = await savedObjectsClient.bulkCreate(retries, { namespace, overwrite });
    retryResults = retryResponse.saved_objects.map(result => ({
      ...result,
      regeneratedId: result.id, // include a `regeneratedId` field so we can inform the end-user that this ID was regenerated
    }));
  }

  const resultSavedObjects: Array<SavedObject<T> & { regeneratedId?: string }> = [];
  bulkCreateResults.forEach(result => {
    if (isLeft(result)) {
      const { retryIndex } = result.value;
      resultSavedObjects.push(retryResults[retryIndex]);
    } else if (isRight(result)) {
      resultSavedObjects.push(result.value);
    }
  });
  // remap results to reflect the object IDs that were submitted for import
  return resultSavedObjects.map(result => {
    const { id } = objectIdMap.get(`${result.type}:${result.id}`)!;
    return { ...result, id };
  });
};
