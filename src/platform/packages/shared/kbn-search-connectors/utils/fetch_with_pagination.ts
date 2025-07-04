/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchHit, SearchResponse, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';

import { Paginate } from '../types/pagination';

const defaultResult = <T>(data: T[]) => ({
  _meta: {
    page: {
      from: 0,
      has_more_hits_than_total: false,
      size: 10,
      total: 0,
    },
  },
  data,
});

export const fetchWithPagination = async <T>(
  fetchFunction: () => Promise<SearchResponse<T>>,
  from: number,
  size: number
): Promise<Paginate<SearchHit<T>>> => {
  if (size === 0) {
    return defaultResult<SearchHit<T>>([]);
  }
  const result = await fetchFunction();
  const total = totalToPaginateTotal(result.hits.total);
  return {
    _meta: {
      page: {
        from,
        size,
        ...total,
      },
    },
    data: result.hits.hits,
  };
};

function totalToPaginateTotal(input: number | SearchTotalHits | undefined): {
  has_more_hits_than_total: boolean;
  total: number;
} {
  if (typeof input === 'number') {
    return { has_more_hits_than_total: false, total: input };
  }

  return input
    ? {
        has_more_hits_than_total: input.relation === 'gte' ? true : false,
        total: input.value,
      }
    : { has_more_hits_than_total: false, total: 0 };
}
