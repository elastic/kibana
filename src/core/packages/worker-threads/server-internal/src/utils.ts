/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExtractTransferableState, kSerialize } from '@kbn/core-base-common';
import { isArray, isPlainObject as lodashIsPlainObject } from 'lodash';
import { TRANSFERABLE_OBJECT_KEY } from './constants';
import { TransferableWorkerService } from './types';

export function isPlainObject(val: any): val is Record<string, any> {
  return lodashIsPlainObject(val);
}

async function recursivelySerialize<T extends Record<string, any>>(obj: T) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'object' && val[kSerialize]) {
      obj[key] = await serialize(val);
    }
  }
  return obj;
}

// Serialize any transferable instance by calling its kSerialize method.
export async function serialize<T>(obj: any): Promise<ExtractTransferableState<T>>;

export async function serialize(obj: any): Promise<unknown> {
  if (
    obj == null ||
    obj === undefined ||
    typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean'
  ) {
    return obj;
  }

  if (obj[kSerialize]) {
    const serialized = await obj[kSerialize]();

    return {
      [TRANSFERABLE_OBJECT_KEY]: {
        value: await serialize(serialized),
        constructor: '_as' in serialized ? serialized._as : obj.constructor.name,
      },
    };
  }

  if (isArray(obj)) {
    return await Promise.all(obj.map((val) => recursivelySerialize(val)));
  }

  if (isPlainObject(obj)) {
    return await recursivelySerialize(obj);
  }

  return obj;
}

export function isTransferableState(obj: unknown): obj is {
  [TRANSFERABLE_OBJECT_KEY]: { value: unknown; constructor: TransferableWorkerService };
} {
  return isPlainObject(obj) && TRANSFERABLE_OBJECT_KEY in obj;
}
