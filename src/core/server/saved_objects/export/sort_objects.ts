/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject } from '../types';

export function sortObjects(savedObjects: SavedObject[]): SavedObject[] {
  const path = new Set<SavedObject>();
  const sorted = new Set<SavedObject>();
  const objectsByTypeId = new Map(
    savedObjects.map((object) => [`${object.type}:${object.id}`, object] as [string, SavedObject])
  );

  function includeObjects(objects: SavedObject[]) {
    for (const object of objects) {
      if (path.has(object)) {
        continue;
      }

      const refdObjects = object.references
        .map((ref) => objectsByTypeId.get(`${ref.type}:${ref.id}`))
        .filter((ref): ref is SavedObject => !!ref);

      if (refdObjects.length) {
        path.add(object);
        includeObjects(refdObjects);
        path.delete(object);
      }

      sorted.add(object);
    }
  }

  includeObjects(savedObjects);
  return [...sorted];
}
