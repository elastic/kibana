/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';

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
