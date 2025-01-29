/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Merges source arrays by merging array items and omitting duplicates.
 * Duplicates checked by exacts match.
 */
export function mergeArrays<T>(sources: Array<readonly T[]>): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();

  for (const itemsSource of sources) {
    for (const item of itemsSource) {
      const searchableItem = toString(item);

      if (seen.has(searchableItem)) {
        continue;
      }

      merged.push(item);
      seen.add(searchableItem);
    }
  }

  return merged;
}

function toString(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    throw new Error('Unable to merge arrays - encountered value is not serializable');
  }
}
