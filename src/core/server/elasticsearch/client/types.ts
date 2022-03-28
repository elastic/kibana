/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

/**
 * All response typings are maintained until elasticsearch-js provides them out of the box
 * https://github.com/elastic/elasticsearch-js/pull/970
 */

/**
 * @public
 */
export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

/**
 * @public
 */
export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

/**
 * @public
 */
export interface ShardsInfo {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
}

/**
 * @public
 */
export interface CountResponse {
  _shards: ShardsInfo;
  count: number;
}

/**
 * @public
 */
export interface SearchResponse<T = unknown> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: number;
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: T;
      _version?: number;
      _explanation?: Explanation;
      fields?: any;
      highlight?: any;
      inner_hits?: any;
      matched_queries?: string[];
      sort?: unknown[];
    }>;
  };
  aggregations?: any;
  pit_id?: string;
}

/**
 * @public
 */
export interface GetResponse<T> {
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  _routing?: string;
  found: boolean;
  _source: T;
  _seq_no: number;
  _primary_term: number;
}

/**
 * @public
 */
export interface DeleteDocumentResponse {
  _shards: ShardsResponse;
  found: boolean;
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  result: string;
  error?: {
    type: string;
  };
}

/**
 * @public
 */
export interface ElasticsearchErrorDetails {
  error?: { type: string; reason?: string };
}
