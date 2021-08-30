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

export function splitOverwrites<T>({
  savedObjects,
  retries,
  getObjKey,
}: {
  savedObjects: Array<SavedObject<T>>;
  retries: SavedObjectsImportRetry[];
  getObjKey: ObjectKeyProvider;
}) {
  const objectsToOverwrite: Array<SavedObject<T>> = [];
  const objectsToNotOverwrite: Array<SavedObject<T>> = [];
  const overwrites = retries.filter((retry) => retry.overwrite).map((retry) => getObjKey(retry));

  for (const savedObject of savedObjects) {
    if (overwrites.includes(getObjKey(savedObject))) {
      objectsToOverwrite.push(savedObject);
    } else {
      objectsToNotOverwrite.push(savedObject);
    }
  }

  return { objectsToOverwrite, objectsToNotOverwrite };
}
