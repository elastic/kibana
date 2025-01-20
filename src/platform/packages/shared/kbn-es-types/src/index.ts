/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as estypes from '@elastic/elasticsearch/lib/api/types';
// TODO: Remove when all usages have been migrated to non-body
import { SearchRequest as SearchRequestWithBodyKey } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Field, QueryDslFieldAndFormat } from '@elastic/elasticsearch/lib/api/types';
import {
  InferSearchResponseOf,
  AggregateOf as AggregationResultOf,
  AggregateOfMap as AggregationResultOfMap,
  SearchHit,
  ESQLColumn,
  ESQLRow,
  ESQLSearchResponse,
  ESQLSearchParams,
  ChangePointType,
} from './search';

export type ESFilter = estypes.QueryDslQueryContainer;
// For now, we also accept with body to unblock the migration to without body.
export type ESSearchRequest = estypes.SearchRequest | SearchRequestWithBodyKey;
export type AggregationOptionsByType = Required<estypes.AggregationsAggregationContainer>;

// Typings for Elasticsearch queries and aggregations. These are intended to be
// moved to the Elasticsearch JS client at some point (see #77720.)

export type MaybeReadonlyArray<T> = T[] | readonly T[];

export type ESSourceOptions = boolean | string | string[];

export interface ESSearchOptions {
  restTotalHitsAsInt: boolean;
}

export type ESSearchResponse<
  TDocument = unknown,
  TSearchRequest extends ESSearchRequest = ESSearchRequest,
  TOptions extends { restTotalHitsAsInt: boolean } = { restTotalHitsAsInt: false }
> = InferSearchResponseOf<TDocument, TSearchRequest, TOptions>;

// `fields` parameter from a search request (estypes.SearchRequest)
export type SearchField = QueryDslFieldAndFormat | Field;

export type {
  InferSearchResponseOf,
  AggregationResultOf,
  AggregationResultOfMap,
  SearchHit,
  ESQLColumn,
  ESQLRow,
  ESQLSearchResponse,
  ESQLSearchParams,
  ChangePointType,
};
