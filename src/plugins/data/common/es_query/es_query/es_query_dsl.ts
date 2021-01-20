/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
