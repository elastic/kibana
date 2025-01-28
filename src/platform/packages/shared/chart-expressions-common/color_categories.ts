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

/**
 * Returns function to get all categories of the dataset for color matching.
 *
 * Used toggle between `colorMapping` and legacy `palette` usage.
 */
export const getColorCategoriesFn =
  (legacy = false) =>
  (rows: DatatableRow[], accessor?: string, isTransposed?: boolean, exclude?: any[]) =>
    legacy
      ? getColorLegacyCategories(rows, accessor, isTransposed)
      : getColorCategories(rows, accessor, isTransposed, exclude);

/**
 * Returns all serialized categories of the dataset for color matching.
 * All non-serializable fields will be as a plain unformatted string.
 */
export function getColorCategories(
  rows: DatatableRow[],
  accessor?: string,
  isTransposed?: boolean,
  exclude?: any[]
): SerializedValue[] {
  const ids = isTransposed
    ? Object.keys(rows[0]).filter((key) => accessor && key.endsWith(accessor))
    : accessor
    ? [accessor]
    : [];

  const seen = new Set<unknown>();
  return rows.reduce<SerializedValue[]>((acc, row) => {
    ids.forEach((id) => {
      const hasValue = Object.hasOwn(row, id);
      const rawValue: RawValue = row[id];
      const value = hasValue && serializeField(rawValue);
      const key = String(rawValue);
      if (hasValue && !exclude?.includes(rawValue) && !seen.has(key)) {
        const value = serializeField(rawValue);
        seen.add(key);
        acc.push(value);
      }
    });
    return acc;
  }, []);
}

/**
 * Returns all stringified categories of the dataset for color matching.
 *
 * Should **only** be used with legacy `palettes`
 */
export function getColorLegacyCategories(
  rows: DatatableRow[],
  accessor?: string,
  isTransposed?: boolean
): SerializedValue[] {
  const ids = isTransposed
    ? Object.keys(rows[0]).filter((key) => accessor && key.endsWith(accessor))
    : accessor
    ? [accessor]
    : [];

  const seen = new Set<unknown>();
  return rows.reduce<SerializedValue[]>((acc, row) => {
    ids.forEach((id) => {
      const hasValue = Object.hasOwn(row, id);
      const key = String(row[id]);
      if (hasValue && !seen.has(key)) {
        seen.add(key);
        acc.push(key);
      }
    });
    return acc;
  }, []);
}
