/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { has } from 'lodash';
import type { Filter, FilterMeta } from './types';

export type QueryWildcardFilterMeta = FilterMeta;

export type QueryWildcardFilter = Filter & {
  meta: QueryWildcardFilterMeta;
  query?: {
    wildcard?: Record<string, string>;
  };
};

/**
 * @param filter
 * @returns `true` if a filter is a `QueryWildcardFilter`
 *
 * @public
 */
export const isQueryWildcardFilter = (filter: Filter): filter is QueryWildcardFilter =>
  has(filter, 'query.wildcard');

/**
 * Creates a filter corresponding to a raw Elasticsearch query DSL object
 * @param query
 * @param index
 * @param alias
 * @returns `QueryWildcardFilter`
 *
 * @public
 */
export const buildQueryWildcardFilter = (
  query: QueryWildcardFilter['query'],
  index: string,
  alias?: string,
  meta: QueryWildcardFilterMeta = {}
) => ({ query, meta: { index, alias, ...meta } });
