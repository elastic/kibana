/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simple utilities for deterministic field ordering.
 */

/**
 * Sort object keys alphabetically for deterministic ordering.
 */
export function sortObjectByKeys<T extends Record<string, unknown>>(obj: T): T {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      (sorted as Record<string, unknown>)[key] = obj[key];
      return sorted;
    }, {} as T);
}

/**
 * Create sorted key-value entries from an object.
 */
export function createSortedEntries<T>(obj: Record<string, T>): Array<[string, T]> {
  return Object.keys(obj)
    .sort()
    .map((key) => [key, obj[key]]);
}
