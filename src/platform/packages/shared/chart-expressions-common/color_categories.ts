/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { RawValue, SerializedValue } from '@kbn/data-plugin/common';
import { MultiFieldKey, serializeField } from '@kbn/data-plugin/common';
import { getValueKey } from '@kbn/coloring';

/**
 * Returns all serialized categories of the dataset for color matching.
 * All non-serializable fields will be as a plain unformatted string.
 *
 * Note: This does **NOT** support transposed columns
 */
export function getColorCategories(
  rows: DatatableRow[] = [],
  accessors: string[] = [],
  exclude?: RawValue[],
  legacyMode: boolean = false // stringifies raw values
): SerializedValue[] {
  if (accessors.length === 0) return [];

  const seen = new Set<unknown>();
  return rows.reduce<SerializedValue[]>((acc, row) => {
    if (accessors.length > 1) {
      // this happens only in ESQL where we can setup multiple splitAccessors.
      // In this case we build a category as a MultiFieldKey containing every values reachable from the accessors.
      const multiKeys = accessors.reduce<string[]>((keys, accessor) => {
        const hasValue = Object.hasOwn(row, accessor);
        if (!hasValue) {
          keys.push(getValueKey(null));
        } else {
          const rawValue: RawValue = row[accessor];
          const key = getValueKey(rawValue);
          keys.push(key);
        }
        return keys;
      }, []);

      const value = new MultiFieldKey({
        key: multiKeys,
      });
      const serializedValue = value.serialize();
      if (!seen.has(value.toString())) {
        // TODO is passing the right legacy move value?
        acc.push(legacyMode ? value : serializedValue);
        seen.add(value.toString());
      }
    } else {
      const accessor = accessors[0];
      const hasValue = Object.hasOwn(row, accessor);
      const rawValue: RawValue = row[accessor];
      const key = getValueKey(rawValue);

      if (hasValue && !exclude?.includes(rawValue) && !seen.has(key)) {
        const value = serializeField(rawValue);
        seen.add(key);
        acc.push(legacyMode ? key : value);
      }
    }
    return acc;
  }, []);
}

/**
 * Returns all *stringified* categories of the dataset for color matching.
 *
 * Should **only** be used with legacy `palettes`
 */
export function getLegacyColorCategories(
  rows?: DatatableRow[],
  accessors?: string[],
  exclude?: RawValue[]
): string[] {
  return getColorCategories(rows, accessors, exclude, true).map(String);
}
