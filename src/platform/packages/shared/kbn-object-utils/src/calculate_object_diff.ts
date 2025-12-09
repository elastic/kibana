/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty, isPlainObject } from 'lodash';

interface Obj {
  [key: PropertyKey]: Obj | unknown;
}

type DeepPartial<TInputObj> = {
  [Prop in keyof TInputObj]?: TInputObj[Prop] extends Obj
    ? DeepPartial<TInputObj[Prop]>
    : TInputObj[Prop];
};

interface ObjectDiffResult<TBase, TCompare> {
  added: DeepPartial<TCompare>;
  removed: DeepPartial<TBase>;
  updated: {
    [K in keyof TBase & keyof TCompare]?: TBase[K] extends TCompare[K] ? never : TCompare[K];
  };
}

function isAllUndefined(obj: unknown): boolean {
  return Array.isArray(obj) && obj.every((value) => value === undefined);
}

/**
 * Compares two JSON objects and calculates the added and removed properties, including nested properties.
 * @param oldObj - The base object.
 * @param newObj - The comparison object.
 * @returns An object containing added and removed properties.
 */
export function calculateObjectDiff<TBase extends Obj, TCompare extends Obj>(
  oldObj: TBase,
  newObj?: TCompare
): ObjectDiffResult<TBase, TCompare> {
  const added: ObjectDiffResult<TBase, TCompare>['added'] = {};
  const removed: ObjectDiffResult<TBase, TCompare>['removed'] = {};
  const updated: ObjectDiffResult<TBase, TCompare>['updated'] = {};

  if (!newObj) return { added, removed, updated };

  function diffRecursive(
    base: Obj,
    compare: Obj,
    addedMap: DeepPartial<Obj>,
    removedMap: DeepPartial<Obj>,
    updatedMap: DeepPartial<Obj>
  ): void {
    for (const key in compare) {
      if (!(key in base)) {
        addedMap[key] = compare[key];
      } else if (isPlainObject(base[key]) && isPlainObject(compare[key])) {
        addedMap[key] = {};
        removedMap[key] = {};
        updatedMap[key] = {};
        diffRecursive(
          base[key] as Obj,
          compare[key] as Obj,
          addedMap[key] as Obj,
          removedMap[key] as Obj,
          updatedMap[key] as Obj
        );
        if (isEmpty(addedMap[key])) delete addedMap[key];
        if (isEmpty(removedMap[key])) delete removedMap[key];
      } else if (Array.isArray(base[key]) && Array.isArray(compare[key])) {
        addedMap[key] = [];
        removedMap[key] = [];
        updatedMap[key] = [];
        diffRecursive(
          // @ts-expect-error upgrade typescript v5.9.3
          base[key] as Obj,
          // @ts-expect-error upgrade typescript v5.9.3
          compare[key] as Obj,
          addedMap[key] as Obj,
          removedMap[key] as Obj,
          updatedMap[key] as Obj
        );
        if (isAllUndefined(addedMap[key])) delete addedMap[key];
        if (isAllUndefined(removedMap[key])) delete removedMap[key];
        if (isAllUndefined(updatedMap[key])) delete updatedMap[key];
      } else if (base[key] !== compare[key]) {
        updatedMap[key] = compare[key];
      }
    }

    for (const key in base) {
      if (!(key in compare)) {
        removedMap[key] = base[key];
      }
    }
  }

  diffRecursive(oldObj, newObj, added, removed, updated);

  return { added, removed, updated };
}
