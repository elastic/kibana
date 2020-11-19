/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import type {
  ApiResponse,
  TransportRequestOptions,
  TransportRequestParams,
  TransportRequestPromise,
} from '@elastic/elasticsearch/lib/Transport';

/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchClient = Omit<
  KibanaClient,
  'connectionPool' | 'transport' | 'serializer' | 'extend' | 'child' | 'close'
> & {
  transport: {
    request(
      params: TransportRequestParams,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse>;
  };
};

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
      sort?: string[];
    }>;
  };
  aggregations?: any;
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
