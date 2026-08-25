/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

export function esqlResultToPlainObjects<
  TDocument extends Record<string, any> = Record<string, unknown>
>(result: ESQLSearchResponse): TDocument[] {
  return result.values.map((row): TDocument => {
    return row.reduce<Record<string, unknown>>((acc, value, index) => {
      const column = result.columns[index];

      if (!column) {
        return acc;
      }

      const name = column.name;
      if (!acc[name]) {
        acc[name] = value;
      }

      return acc;
    }, {}) as TDocument;
  });
}
