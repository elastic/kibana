/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getESQLWithSafeLimit(esql: string, limit: number): string {
  if (!esql.trim().toLowerCase().startsWith('from')) {
    return esql;
  }
  const parts = esql.split('|');

  if (!parts.length) {
    return esql;
  }

  const fromCommandIndex = 0;
  const sortCommandIndex = 1;
  const index =
    parts.length > 1 && parts[1].trim().toLowerCase().startsWith('sort')
      ? sortCommandIndex
      : fromCommandIndex;

  return parts
    .map((part, i) => {
      if (i === index) {
        return `${part.trim()} | LIMIT ${limit}`;
      }
      return part;
    })
    .join('|');
}
