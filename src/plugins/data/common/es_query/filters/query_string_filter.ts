/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, FilterMeta } from './meta_filter';

export type QueryStringFilterMeta = FilterMeta;

export type QueryStringFilter = Filter & {
  meta: QueryStringFilterMeta;
  query?: {
    query_string: {
      query: string;
    };
  };
};

export const isQueryStringFilter = (filter: any): filter is QueryStringFilter =>
  filter && filter.query && filter.query.query_string;

// Creates a filter corresponding to a raw Elasticsearch query DSL object
export const buildQueryFilter = (query: QueryStringFilter['query'], index: string, alias: string) =>
  ({
    query,
    meta: {
      index,
      alias,
    },
  } as QueryStringFilter);
