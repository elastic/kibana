/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import type { ObjectKeyProvider } from './get_object_key';
import { SavedObjectsImportRetry } from '../types';

export function createObjectsFilter(
  retries: SavedObjectsImportRetry[],
  getObjKey: ObjectKeyProvider
): (obj: SavedObject) => boolean {
  const retryKeys = new Set<string>(retries.map((retry) => getObjKey(retry)));
  return (obj: SavedObject) => {
    return retryKeys.has(getObjKey(obj));
  };
}
