/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';

export function appendKeyPath(prefix: string, suffix: string): string {
  if (suffix.startsWith('[')) {
    return prefix ? `${prefix}${suffix}` : suffix;
  }
  return prefix ? `${prefix}.${suffix}` : suffix;
}
/**
 * Takes an object or array and returns a flattened version with dot notation for nested keys.
 *
 * @param {JsonObject | JsonArray} val - object or array to flatten
 * @returns {Record<string, number | string | boolean | null>}
 */
export function flattenKeyPaths(
  value: JsonObject | JsonArray
): Record<string, number | string | boolean | null> {
  const flat: Record<string, number | string | boolean | null> = {};

  function flatten(val: JsonValue, key: string = ''): void {
    if (Array.isArray(val)) {
      if (val.length > 0) {
        val.forEach((item, index) => flatten(item, appendKeyPath(key, `[${index}]`)));
      } else {
        flat[key] = null; // null will be displayed as '-' in the table
      }
    } else if (typeof val === 'object' && val !== null) {
      if (Object.keys(val).length > 0) {
        Object.entries(val).forEach(([childKey, item]) => {
          flatten(item, appendKeyPath(key, childKey));
        });
      } else {
        flat[key] = null; // null will be displayed as '-' in the table
      }
    } else {
      flat[key] = val;
    }
  }

  flatten(value);
  return flat;
}
