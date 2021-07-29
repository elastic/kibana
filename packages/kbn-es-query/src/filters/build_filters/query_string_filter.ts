/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import type { FieldFilter, Filter, FilterMeta } from './types';

export type QueryStringFilterMeta = FilterMeta;

export type QueryStringFilter = Filter & {
  meta: QueryStringFilterMeta;
  query?: {
    query_string: {
      query: string;
    };
  };
};

/**
 * @param filter
 * @returns `true` if a filter is a `QueryStringFilter`
 *
 * @public
 */
export const isQueryStringFilter = (filter: FieldFilter): filter is QueryStringFilter =>
  get(filter, 'query.query_string');

/**
 * Creates a filter corresponding to a raw Elasticsearch query DSL object
 * @param query
 * @param index
 * @param alias
 * @returns `QueryStringFilter`
 *
 * @public
 */
export const buildQueryFilter = (query: QueryStringFilter['query'], index: string, alias: string) =>
  ({
    query,
    meta: {
      index,
      alias,
    },
  } as QueryStringFilter);
