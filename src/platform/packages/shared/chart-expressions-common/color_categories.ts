/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DatatableRow } from '@kbn/expressions-plugin/common';
import { RawValue, SerializedValue, serializeField } from '@kbn/data-plugin/common';
import { getValueKey } from '@kbn/coloring';

/**
 * Returns all serialized categories of the dataset for color matching.
 * All non-serializable fields will be as a plain unformatted string.
 *
 * Note: This does **NOT** support transposed columns
 */
export function getColorCategories(
  rows: DatatableRow[] = [],
  accessor?: string,
  exclude?: RawValue[],
  legacyMode: boolean = false // stringifies raw values
): SerializedValue[] {
  if (!accessor) return [];

  const seen = new Set<unknown>();
  return rows.reduce<SerializedValue[]>((acc, row) => {
    const hasValue = Object.hasOwn(row, accessor);
    const rawValue: RawValue = row[accessor];
    const key = getValueKey(rawValue);
    if (hasValue && !exclude?.includes(rawValue) && !seen.has(key)) {
      const value = serializeField(rawValue);
      seen.add(key);
      acc.push(legacyMode ? key : value);
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
  accessor?: string,
  exclude?: RawValue[]
): string[] {
  return getColorCategories(rows, accessor, exclude, true).map(String);
}
