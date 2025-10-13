/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

function splitFilters(value: string) {
  return value
    .split(/\bwhere\b/i)
    .filter((item) => item !== '')
    .map((item) => item.trim());
}

export function extractFilters(query: string) {
  return query
    .split('|')
    .flatMap((item) => {
      const value = item.trim();
      if (/\bwhere\b/i.test(value)) {
        return splitFilters(value);
      }
      return [];
    })
    .filter((item) => item !== '');
}
