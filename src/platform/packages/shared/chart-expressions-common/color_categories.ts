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
 * Get the stringified version of all the categories that needs to be colored in the chart.
 * Multifield keys will return as array of string and simple fields (numeric, string) will be returned as a plain unformatted string.
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
        seen.add(key);
        acc.push(value);
      }
    });
    return acc;
  }, []);
}
