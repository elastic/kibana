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
 * @param setA The first Set to compare
 * @param setB The second Set to compare
 * @returns {boolean} True if Set A is equal to Set B
 */
export function setsAreEqual<T>(setA: Set<T>, setB: Set<T>) {
  if (setA.size !== setB.size) return false;

  for (const element of setA) {
    if (!setB.has(element)) {
      return false;
    }
  }

  return true;
}

/**
 * Determines if a given map of arrays is equal to another given map of arrays.
 * Used for comparing namespace maps in saved object repo/security extension tests.
 *
 * @param mapA The first map to compare
 * @param mapB The second map to compare
 * @returns {boolean} True if map A is equal to map B
 */
export function arrayMapsAreEqual<T>(mapA: Map<T, T[] | undefined>, mapB: Map<T, T[] | undefined>) {
  if (mapA?.size !== mapB?.size) return false;

  for (const [key, valueA] of mapA!) {
    const valueB = mapB?.get(key);
    if (valueA?.length !== valueB?.length) return false;
    if (!isEqual(valueA?.sort(), valueB?.sort())) return false;
  }

  return true;
}

/**
 * Determines if a given Map of Sets is equal to another given Map of Sets.
 * Used for comparing typeMaps and enforceMaps in saved object repo/security extension tests.
 *
 * @param mapA The first map to compare
 * @param mapB The second map to compare
 * @returns {boolean} True if map A is equal to map B
 */
export function setMapsAreEqual<T>(
  mapA: Map<T, Set<T>> | undefined,
  mapB: Map<T, Set<T>> | undefined
) {
  if (mapA?.size !== mapB?.size) return false;

  for (const [key, valueA] of mapA!) {
    const valueB = mapB?.get(key);
    if (!valueB || !setsAreEqual(valueA, valueB)) return false;
  }

  return true;
}
