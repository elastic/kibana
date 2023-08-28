/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableRow } from '@kbn/expressions-plugin/common';
import { isMultiFieldKey } from '@kbn/data-plugin/common';

export function getColorCategories(rows: DatatableRow[], accessor?: string) {
  return accessor
    ? rows.reduce<{ keys: Set<string>; array: Array<string | string[]> }>(
        (acc, r) => {
          const value = r[accessor];
          if (value === undefined) {
            return acc;
          }
          const key = (isMultiFieldKey(value) ? [...value.keys] : [value]).map(String);
          const stringifiedKeys = key.join(',');
          if (!acc.keys.has(stringifiedKeys)) {
            acc.keys.add(stringifiedKeys);
            acc.array.push(key.length === 1 ? key[0] : key);
          }
          return acc;
        },
        { keys: new Set(), array: [] }
      ).array
    : [];
}
