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
  // console.log(`*** SET A: ${Array.from(setA)}`);
  // console.log(`*** SET B: ${Array.from(setB)}`);
  return isEqual(Array.from(setA).sort(), Array.from(setB).sort());
}

/**
 * Determines if a given type map is equal to another given type map.
 *
 * @param mapA the first type map to compare
 * @param mapB the second type map to compare
 * @returns {boolean} True if type map A is equal to type map B
 */
export function typeMapsAreEqual(mapA: Map<string, Set<string>>, mapB: Map<string, Set<string>>) {
  return (
    mapA.size === mapB.size &&
    isEqual(Array.from(mapA!.keys()).sort(), Array.from(mapB!.keys()).sort()) &&
    Array.from(mapA.keys()).every((key) => setsAreEqual(mapA.get(key)!, mapB.get(key)!))
  );
}

/**
 * Determines if a given namespace map is equal to another given namespace map.
 *
 * @param mapA the first namespace map to compare
 * @param mapB the second namespace map to compare
 * @returns {boolean} True if namespace map A is equal to namespace map B
 */
export function namespaceMapsAreEqual(
  mapA: Map<string, string[] | undefined>,
  mapB: Map<string, string[] | undefined>
) {
  // console.log(`COMPARING MAPS: ${Array.from(mapA.keys())} --- ${Array.from(mapB.keys())}`);
  return (
    mapA.size === mapB.size &&
    isEqual(Array.from(mapA!.keys()).sort(), Array.from(mapB!.keys()).sort()) &&
    Array.from(mapA.keys()).every((key) => isEqual(mapA.get(key)?.sort(), mapB.get(key)?.sort()))
  );
}

/**
 * Determines if a given enforce map is equal to another given enforce map.
 *
 * @param mapA the first enforce map to compare
 * @param mapB the second enforce map to compare
 * @returns {boolean} True if enforce map A is equal to enforce map B
 */
export function enforceMapsAreEqual(
  mapA: Map<string, Set<string>> | undefined,
  mapB: Map<string, Set<string>> | undefined
) {
  // console.log(`COMPARING MAPS: ${mapA?.size}, ${mapB?.size}...`);
  return (
    mapA?.size === mapB?.size &&
    isEqual(Array.from(mapA!.keys()).sort(), Array.from(mapB!.keys()).sort()) &&
    Array.from(mapA!.keys()).every((key) => setsAreEqual(mapA!.get(key)!, mapB!.get(key)!))
  );
}
