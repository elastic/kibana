/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_ITEMS_PER_PAGE } from './constants';

export interface SearchPageParams {
  size: number;
  query: unknown;
  sort: unknown;
  search_after?: unknown[];
}

export interface SearchPageResponse {
  hits: { hits: Array<{ _source?: unknown; sort?: unknown[] }> };
}

/** A client-agnostic page fetcher; callers bind their ES client (and any fixed params). */
export type PageSearchFn = (params: SearchPageParams) => Promise<SearchPageResponse>;

const DEFAULT_SORT = [{ '@timestamp': 'asc' }, { _doc: 'asc' }];

/**
 * Fetches every `_source` matching `query`, paging with `search_after` so it can return
 * more than Elasticsearch's 10k `max_result_window`. Stops once `max` documents are
 * collected; `truncated` reports whether more existed.
 *
 * Client-agnostic: the caller supplies a `search` callback bound to its ES client and any
 * fixed parameters (events, `track_total_hits`, `_source`, etc.).
 */
export async function searchAllPages<TSource = unknown>({
  search,
  query,
  max,
  sort = DEFAULT_SORT,
  pageSize = MAX_ITEMS_PER_PAGE,
}: {
  search: PageSearchFn;
  query: unknown;
  max: number;
  /** Sort used for `search_after`; must yield a stable total order (defaults to `@timestamp` + `_doc`). */
  sort?: unknown;
  pageSize?: number;
}): Promise<{ docs: TSource[]; truncated: boolean }> {
  const docs: TSource[] = [];
  let searchAfter: unknown[] | undefined;

  while (docs.length < max) {
    const size = Math.min(pageSize, max - docs.length);
    const response = await search({
      size,
      query,
      sort,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });

    const { hits } = response.hits;
    for (const hit of hits) {
      if (hit._source !== undefined && hit._source !== null) {
        docs.push(hit._source as TSource);
      }
    }

    const lastSort = hits[hits.length - 1]?.sort;
    // A short page means we've exhausted the matches.
    if (hits.length < size || !lastSort) {
      return { docs, truncated: false };
    }
    searchAfter = lastSort;
  }

  // We stopped because we hit `max`; there may be more documents we didn't fetch.
  return { docs, truncated: true };
}
