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

import { SavedObject } from '../../../types';
import { KibanaRequest } from '../../http';
import { SavedObjectsExportError } from './errors';
import { SavedObjectsExportTransform, SavedObjectsExportTransformContext } from './types';

interface ApplyExportTransformsOptions {
  objects: SavedObject[];
  request: KibanaRequest;
  transforms: Record<string, SavedObjectsExportTransform>;
  sortFunction?: (obj1: SavedObject, obj2: SavedObject) => number;
}

export const applyExportTransforms = async ({
  objects,
  request,
  transforms,
  sortFunction,
}: ApplyExportTransformsOptions): Promise<SavedObject[]> => {
  const context = createContext(request);
  const byType = splitByType(objects);

  let finalObjects: SavedObject[] = [];
  for (const [type, typeObjs] of Object.entries(byType)) {
    const typeTransformFn = transforms[type];
    if (typeTransformFn) {
      finalObjects = [
        ...finalObjects,
        ...(await applyTransform(typeObjs, typeTransformFn, context)),
      ];
    } else {
      finalObjects = [...finalObjects, ...typeObjs];
    }
  }

  if (sortFunction) {
    finalObjects.sort(sortFunction);
  }

  return finalObjects;
};

const applyTransform = async (
  objs: SavedObject[],
  transformFn: SavedObjectsExportTransform,
  context: SavedObjectsExportTransformContext
) => {
  const objKeys = objs.map(getObjKey);
  let transformedObjects: SavedObject[];
  try {
    transformedObjects = await transformFn(context, objs);
  } catch (e) {
    throw SavedObjectsExportError.objectTransformError(objs, e);
  }
  assertValidTransform(transformedObjects, objKeys);
  return transformedObjects;
};

const createContext = (request: KibanaRequest): SavedObjectsExportTransformContext => {
  return {
    request,
  };
};

const splitByType = (objects: SavedObject[]): Record<string, SavedObject[]> => {
  return objects.reduce((memo, obj) => {
    memo[obj.type] = [...(memo[obj.type] ?? []), obj];
    return memo;
  }, {} as Record<string, SavedObject[]>);
};

const getObjKey = (obj: SavedObject) => `${obj.type}|${obj.id}`;

const assertValidTransform = (transformedObjects: SavedObject[], initialKeys: string[]) => {
  const transformedKeys = transformedObjects.map(getObjKey);
  const missingKeys: string[] = [];
  initialKeys.forEach((initialKey) => {
    if (!transformedKeys.includes(initialKey)) {
      missingKeys.push(initialKey);
    }
  });
  if (missingKeys.length) {
    throw SavedObjectsExportError.invalidTransformError(missingKeys);
  }
};
