/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common';

const getId = (object: { type: string; id: string }) => `${object.type}:${object.id}`;

export function sortObjects(savedObjects: SavedObject[]): SavedObject[] {
  const traversed = new Set<string>();
  const sorted = new Set<SavedObject>();
  const objectsByTypeId = new Map(
    savedObjects.map((object) => [getId(object), object] as [string, SavedObject])
  );

  function includeObjects(objects: SavedObject[]) {
    for (const object of objects) {
      const objectId = getId(object);
      if (traversed.has(objectId)) {
        continue;
      }

      const objectRefs = object.references
        .map((ref) => objectsByTypeId.get(getId(ref)))
        .filter((ref): ref is SavedObject => !!ref);

      traversed.add(objectId);
      if (objectRefs.length) {
        includeObjects(objectRefs);
      }

      sorted.add(object);
    }
  }

  includeObjects(savedObjects);

  return [...sorted];
}
