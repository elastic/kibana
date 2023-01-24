/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  SavedObjectsExportTransform,
  SavedObjectsExportTransformContext,
  SavedObject,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsExportError } from './errors';
import { getObjKey, type SavedObjectComparator } from './utils';

interface ApplyExportTransformsOptions {
  objects: SavedObject[];
  request: KibanaRequest;
  transforms: Map<string, SavedObjectsExportTransform>;
  sortFunction?: SavedObjectComparator;
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
    const typeTransformFn = transforms.get(type);
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
