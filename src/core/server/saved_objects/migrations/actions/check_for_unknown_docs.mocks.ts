/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

interface DocIdsByType {
  [type: string]: string[];
}

export const createAggregateTypesSearchResponse = (typesIds: DocIdsByType = {}): SearchResponse => {
  return {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: Object.keys(typesIds).length,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      typesAggregation: {
        buckets: Object.entries(typesIds).map(([type, ids]) => ({
          key: type,
          docs: { hits: { hits: ids.map((_id) => ({ _id })) } },
        })),
      },
    },
  };
};
