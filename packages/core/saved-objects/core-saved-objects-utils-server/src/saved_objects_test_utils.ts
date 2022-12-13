/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';

export function setsAreEqual<T>(setA: Set<T>, setB: Set<T>) {
  // console.log(`*** SET A: ${Array.from(setA)}`);
  // console.log(`*** SET B: ${Array.from(setB)}`);
  return isEqual(Array.from(setA).sort(), Array.from(setB).sort());
}

export function typeMapsAreEqual(mapA: Map<string, Set<string>>, mapB: Map<string, Set<string>>) {
  return (
    mapA.size === mapB.size &&
    isEqual(Array.from(mapA!.keys()).sort(), Array.from(mapB!.keys()).sort()) &&
    Array.from(mapA.keys()).every((key) => setsAreEqual(mapA.get(key)!, mapB.get(key)!))
  );
}

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
