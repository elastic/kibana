/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse, ShardsResponse } from 'elasticsearch';

export const HITS_TOTAL_RELATION = {
  EQ: 'eq',
  GTE: 'gte',
} as const;
export type HitsTotalRelation = typeof HITS_TOTAL_RELATION[keyof typeof HITS_TOTAL_RELATION];

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
interface SearchResponse7Hits<T> {
  hits: SearchResponse<T>['hits']['hits'];
  max_score: number;
  total: {
    value: number;
    relation: HitsTotalRelation;
  };
}
export interface SearchResponse7<T = any> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: SearchResponse7Hits<T>;
  aggregations?: any;
}
