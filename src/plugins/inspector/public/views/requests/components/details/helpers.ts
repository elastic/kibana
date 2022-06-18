/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const hasIndexFilter = (query: unknown, indexFilters: Set<string>) => {
  if (typeof query === 'object' && query != null) {
    Object.keys(query).forEach((key) => {
      if (key === '_index') {
        indexFilters.add(query[key]);
      } else {
        hasIndexFilter(query[key], indexFilters);
      }
    });
  }
  return indexFilters;
};
export const findIndexFilters = (query: object | null | undefined) => {
  const indexFilters = new Set<string>();
  hasIndexFilter(query, indexFilters);
  return [...indexFilters];
};
