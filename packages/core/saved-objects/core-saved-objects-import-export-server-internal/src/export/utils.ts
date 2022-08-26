/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common';

export type SavedObjectComparator = (a: SavedObject, b: SavedObject) => number;

export const getObjKey = (obj: SavedObject) => `${obj.type}|${obj.id}`;

export const byIdAscComparator: SavedObjectComparator = (a: SavedObject, b: SavedObject) =>
  a.id > b.id ? 1 : -1;

/**
 * Create a comparator that will sort objects depending on their position in the provided array.
 * Objects not present in the array will be appended at the end of the list, and sorted by id asc.
 *
 * @example
 * ```ts
 * const comparator = getPreservedOrderComparator([objA, objB, objC]);
 * const list = [newB, objB, objC, newA, objA]; // with obj.title matching their variable name
 * list.sort()
 * // list = [objA, objB, objC, newA, newB]
 * ```
 */
export const getPreservedOrderComparator = (objects: SavedObject[]): SavedObjectComparator => {
  const orderedKeys = objects.map(getObjKey);
  return (a: SavedObject, b: SavedObject) => {
    const indexA = orderedKeys.indexOf(getObjKey(a));
    const indexB = orderedKeys.indexOf(getObjKey(b));
    if (indexA > -1 && indexB > -1) {
      return indexA - indexB > 0 ? 1 : -1;
    }
    if (indexA > -1) {
      return -1;
    }
    if (indexB > -1) {
      return 1;
    }
    return byIdAscComparator(a, b);
  };
};
