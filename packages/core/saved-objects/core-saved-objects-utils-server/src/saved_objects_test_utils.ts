/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';

/**
 * Determines if a given Set is equal to another given Set. Set types must be the same, and comparable.
 *
 * @param setA the first Set to compare
 * @param setB the second Set to compare
 * @returns {boolean} True if Set A is equal to Set B
 */
export function setsAreEqual<T>(setA: Set<T>, setB: Set<T>) {
  if (setA.size !== setB.size) return false;

  var NotEqualException = {};
  try {
    setA.forEach(element => {
      // End the loop early if we found an inequality
      if(!setB.has(element)) throw NotEqualException;
    });
  } catch (e) {
    if (e === NotEqualException) return false;
    throw e;
  }

  return true;
}

/**
 * Determines if a given map of arrays is equal to another given map of arrays.
 * Used for comparing namespace maps in saved object repo/security extension tests.
 *
 * @param mapA the first map to compare
 * @param mapB the second map to compare
 * @returns {boolean} True if map A is equal to map B
 */
export function arrayMapsAreEqual<T>(
  mapA: Map<T, T[] | undefined>,
  mapB: Map<T, T[] | undefined>
) {
  return (
    mapA.size === mapB.size &&
    Array.from(mapA.keys()).every((key) => mapB.has(key) && isEqual(mapA.get(key)?.sort(), mapB.get(key)?.sort()))
  );
}

/**
 * Determines if a given Map of Sets is equal to another given Map of Sets.
 * Used for comparing typeMaps and enforceMaps in saved object repo/security extension tests.
 *
 * @param mapA the first map to compare
 * @param mapB the second map to compare
 * @returns {boolean} True if map A is equal to map B
 */
export function setMapsAreEqual<T>(
  mapA: Map<T, Set<T>> | undefined,
  mapB: Map<T, Set<T>> | undefined
) {
  return (
    mapA?.size === mapB?.size &&
    Array.from(mapA!.keys()).every((key) => mapB?.has(key) && setsAreEqual(mapA!.get(key)!, mapB!.get(key)!))
  );
}
