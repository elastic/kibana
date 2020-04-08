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

import uuidv5 from 'uuid/v5';
import { SavedObject, SavedObjectsClientContract } from '../types';
import { ISavedObjectTypeRegistry } from '..';

interface CreateSavedObjectsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  namespace?: string;
  overwrite?: boolean;
}

type SavedObjectType = SavedObject<unknown>;
type UnresolvableConflict = { retryIndex: number; retryObject: SavedObjectType };
type Left = { tag: 'left'; value: UnresolvableConflict };
type Right = { tag: 'right'; value: SavedObjectType };
type Either = Left | Right;
const isLeft = (object: Either): object is Left => object.tag === 'left';
const isRight = (object: Either): object is Right => object.tag === 'right';

const generateLinkedId = (id: string, namespace?: string) => {
  const name = `${namespace ?? 'default'}:${id}`;
  return uuidv5(name, uuidv5.DNS);
};

const isUnresolvableConflict = (object: SavedObjectType) =>
  object.error?.statusCode === 409 && object.error?.metadata?.isNotOverwriteable;

export const createSavedObjects = async (
  objects: SavedObjectType[],
  options: CreateSavedObjectsOptions
) => {
  const { savedObjectsClient, typeRegistry, namespace, overwrite } = options;
  const isLinkable = (object: SavedObjectType) =>
    typeRegistry.isMultiNamespace(object.type) && object.originId !== undefined;

  // when importing saved objects, if `originId` is present, use that instead of the id
  const objectIdMap = new Map<string, SavedObjectType>();
  const modifiedSavedObjects = objects.map(object => {
    const modifiedObject = isLinkable(object) ? { ...object, id: object.originId } : object;
    objectIdMap.set(`${modifiedObject.type}:${modifiedObject.id}`, object);
    return modifiedObject;
  });

  const bulkCreateResponse = await savedObjectsClient.bulkCreate(modifiedSavedObjects, {
    namespace,
    overwrite,
  });

  // retry bulkCreate for multi-namespace saved objects with an `originId` that had an unresolvable conflict
  let retryIndexCounter = 0;
  const bulkCreateResults: Either[] = bulkCreateResponse.saved_objects.map(result => {
    const object = objectIdMap.get(`${result.type}:${result.id}`)!;
    if (isUnresolvableConflict(result) && isLinkable(object)) {
      const linkedId = generateLinkedId(object.originId!, namespace);
      const retryObject = { ...object, id: linkedId };
      objectIdMap.set(`${retryObject.type}:${retryObject.id}`, object);
      return { tag: 'left', value: { retryIndex: retryIndexCounter++, retryObject } };
    }
    return { tag: 'right', value: result };
  });

  const retries = bulkCreateResults.filter(isLeft).map(x => x.value.retryObject);
  let retryResults: SavedObjectType[] = [];
  if (retries.length > 0) {
    const retryResponse = await savedObjectsClient.bulkCreate(retries, { namespace, overwrite });
    retryResults = retryResponse.saved_objects;
  }

  const resultSavedObjects: SavedObjectType[] = [];
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
    const object = objectIdMap.get(`${result.type}:${result.id}`)!;
    return { ...result, id: object.id! };
  });
};
