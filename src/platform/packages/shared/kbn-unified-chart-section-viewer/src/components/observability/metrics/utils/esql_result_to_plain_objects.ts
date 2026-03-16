/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

/**
 * Parses ESQL results by combining columns and rows into plain objects.
 * ESQL returns { columns: [{ name, type }, ...], values: [[...], [...], ...] };
 * each row is an array of values. This maps each row to an object whose keys
 * are the column names and values are the row cells.
 *
 * @example
 * // ESQL returns columns + rows:
 * // columns: [{ name: 'host.name', type: 'keyword' }, { name: 'cpu', type: 'double' }]
 * // values:  [['host-a', 0.5], ['host-b', 0.8]]
 * // Result: [{ 'host.name': 'host-a', cpu: 0.5 }, { 'host.name': 'host-b', cpu: 0.8 }]
 */
export function esqlResultToPlainObjects<TDocument extends object = Record<string, unknown>>(
  result: ESQLSearchResponse
): TDocument[] {
  return result.values.map((row): TDocument => {
    return row.reduce<Record<string, unknown>>((acc, value, index) => {
      const column = result.columns[index];

      if (!column) {
        return acc;
      }

      const name = column.name;
      if (!(name in acc)) {
        acc[name] = value;
      }

      return acc;
    }, {}) as TDocument;
  });
}
