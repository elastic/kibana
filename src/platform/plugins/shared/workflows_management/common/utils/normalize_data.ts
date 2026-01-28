/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unflattenObject } from '@kbn/object-utils';

/**
 * Normalizes any object with flat ECS-style field names into nested structure.
 * Preserves original flat keys for backward compatibility.
 *
 * Similar to normalizeAlert but works on any object structure.
 * This function:
 * 1. Expands dotted fields (e.g., "kibana.alert.rule.name") into nested objects
 * 2. Preserves original flat keys alongside the expanded structure
 * 3. Works recursively on nested objects and arrays
 *
 * @example
 * // Input:
 * {
 *   "kibana.alert.rule.name": "test-rule",
 *   "service.name": "payment-service"
 * }
 *
 * // Output:
 * {
 *   "kibana.alert.rule.name": "test-rule",  // Preserved flat key
 *   "service.name": "payment-service",       // Preserved flat key
 *   "kibana": {
 *     "alert": {
 *       "rule": { "name": "test-rule" }      // Nested structure
 *     }
 *   },
 *   "service": {
 *     "name": "payment-service"              // Nested structure
 *   }
 * }
 */
export function normalizeData<T extends Record<string, unknown>>(data: T): T {
  /**
   * Checks if a value is a plain object (not null, not array, is object)
   */
  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  // Helper to recursively merge flat keys from original with unflattened structure
  function mergeFlatKeys(
    original: Record<string, unknown>,
    unflattenedObj: Record<string, unknown>
  ): Record<string, unknown> {
    // Extract flat keys at current level
    const flatKeys: Record<string, unknown> = {};
    for (const key of Object.keys(original)) {
      if (key.includes('.') && key !== '_id' && key !== '_index') {
        flatKeys[key] = original[key];
      }
    }

    // Merge unflattened structure, recursively handling nested objects and arrays
    const merged = { ...flatKeys, ...unflattenedObj };
    for (const key of Object.keys(unflattenedObj)) {
      const originalValue = original[key];
      const unflattenedValue = unflattenedObj[key];

      if (isPlainObject(originalValue) && isPlainObject(unflattenedValue)) {
        // Recursively merge nested objects
        merged[key] = mergeFlatKeys(originalValue, unflattenedValue);
      } else if (Array.isArray(originalValue) && Array.isArray(unflattenedValue)) {
        // Recursively merge arrays
        merged[key] = originalValue.map((item, index) => {
          const unflattenedItem = unflattenedValue[index];
          if (isPlainObject(item) && isPlainObject(unflattenedItem)) {
            return mergeFlatKeys(item, unflattenedItem);
          }
          return unflattenedItem;
        });
      }
    }

    return merged;
  }

  // Recursively unflatten the entire structure
  // Note: unflattenObject doesn't mutate the source, it only reads from it
  const unflattened = unflattenObject(data) as Record<string, unknown>;
  return mergeFlatKeys(data, unflattened) as T;
}
