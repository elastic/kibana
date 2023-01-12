/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import assert from 'assert';
import { get } from 'lodash';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

function isObject(v: unknown): v is object {
  return Object.prototype.toString.call(v) === '[object Object]';
}

/**
 * 1. Walk the current mappings
 * 2. For each mapped field (i.e., for each field under a "properties" object)
 *    in current, check that the same field exists in next
 * 3. If we see any missing fields in next, throw an appropriate error
 */
export function throwIfMappedFieldRemoved(
  current: SavedObjectsTypeMappingDefinitions,
  next: SavedObjectsTypeMappingDefinitions
): { checkedCount: number } {
  let checkedCount = 0;
  const Os: Array<[path: string[], value: unknown]> = [[[], current]];
  const missingProps: string[] = [];

  while (Os.length) {
    const [path, value] = Os.shift()!;
    // "Recurse" into the value if it's an object
    if (isObject(value)) {
      Object.entries(value).forEach(([k, v]) => Os.push([[...path, k], v]));
    }
    // If we're at a "properties" object, check that the next mappings have the same field
    if (path.length > 1 && path[path.length - 2] === 'properties') {
      const prop = path.join('.');
      if (!get(next, prop)) missingProps.push(prop);
      checkedCount++;
    }
  }

  assert(
    missingProps.length === 0,
    `Removing mapped properties is disallowed. Properties found in current mappings but not in next mappings:\n${JSON.stringify(
      missingProps,
      null,
      2
    )}`
  );
  return {
    checkedCount,
  };
}
