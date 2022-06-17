/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const hasIndexFilter = (query: unknown, indexFilters: string[]) => {
  if (typeof query !== 'string' && typeof query !== 'number' && query != null) {
    Object.keys(query).forEach((key) => {
      if (key === '_index') {
        indexFilters.push(query[key]);
      } else {
        hasIndexFilter(query[key], indexFilters);
      }
    });
  }
  return indexFilters;
};
export const findIndexFilters = (query: object) => {
  const indexFilters: string[] = [];
  hasIndexFilter(query, indexFilters);
  return indexFilters.join(' ,');
};
