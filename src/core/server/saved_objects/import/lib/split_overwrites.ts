/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject } from '../../types';
import { SavedObjectsImportRetry } from '../types';

export function splitOverwrites<T>(
  savedObjects: Array<SavedObject<T>>,
  retries: SavedObjectsImportRetry[]
) {
  const objectsToOverwrite: Array<SavedObject<T>> = [];
  const objectsToNotOverwrite: Array<SavedObject<T>> = [];
  const overwrites = retries
    .filter((retry) => retry.overwrite)
    .map((retry) => `${retry.type}:${retry.id}`);

  for (const savedObject of savedObjects) {
    if (overwrites.includes(`${savedObject.type}:${savedObject.id}`)) {
      objectsToOverwrite.push(savedObject);
    } else {
      objectsToNotOverwrite.push(savedObject);
    }
  }

  return { objectsToOverwrite, objectsToNotOverwrite };
}
