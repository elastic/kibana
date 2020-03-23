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

import { has } from 'lodash';

export interface DslRangeQuery {
  range: {
    [name: string]: {
      gte: number;
      lte: number;
      format: string;
    };
  };
}

export interface DslMatchQuery {
  match: {
    [name: string]: {
      query: string;
      operator: string;
      zero_terms_query: string;
    };
  };
}

export interface DslQueryStringQuery {
  query_string: {
    query: string;
    analyze_wildcard?: boolean;
  };
}

export interface DslMatchAllQuery {
  match_all: Record<string, string>;
}

export interface DslTermQuery {
  term: Record<string, string>;
}

export type DslQuery =
  | DslRangeQuery
  | DslMatchQuery
  | DslQueryStringQuery
  | DslMatchAllQuery
  | DslTermQuery;

export const isEsQueryString = (query: any): query is DslQueryStringQuery =>
  has(query, 'query_string.query');
