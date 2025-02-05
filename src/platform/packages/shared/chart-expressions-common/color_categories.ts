/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DatatableRow } from '@kbn/expressions-plugin/common';
import { isMultiFieldKey } from '@kbn/data-plugin/common';

/**
 * Get the stringified version of all the categories that needs to be colored in the chart.
 * Multifield keys will return as array of string and simple fields (numeric, string) will be returned as a plain unformatted string.
 *
 * Note: This does **NOT** support transposed columns
 */
export function getColorCategories(
  rows: DatatableRow[] = [],
  accessor?: string,
  exclude?: any[]
): Array<string | string[]> {
  if (!accessor) return [];

  return rows
    .filter(({ [accessor]: v }) => !(v === undefined || exclude?.includes(v)))
    .map((r) => {
      const v = r[accessor];
      // The categories needs to be stringified in their unformatted version.
      // We can't distinguish between a number and a string from a text input and the match should
      // work with both numeric field values and string values.
      const key = (isMultiFieldKey(v) ? v.keys : [v]).map(String);
      const stringifiedKeys = key.join(',');
      return { key, stringifiedKeys };
    })
    .reduce<{ keys: Set<string>; categories: Array<string | string[]> }>(
      (acc, { key, stringifiedKeys }) => {
        if (!acc.keys.has(stringifiedKeys)) {
          acc.keys.add(stringifiedKeys);
          acc.categories.push(key.length === 1 ? key[0] : key);
        }
        return acc;
      },
      { keys: new Set(), categories: [] }
    ).categories;
}
