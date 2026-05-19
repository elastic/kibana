/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
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
export type ESSearchRequest = estypes.SearchRequest;
export type AggregationOptionsByType = Required<estypes.AggregationsAggregationContainer>;
export type MaybeReadonlyArray<T> = T[] | readonly T[];
export type ESSourceOptions = boolean | string | string[];
export interface ESSearchOptions {
  restTotalHitsAsInt: boolean;
}
export type ESSearchResponse<
  TDocument = unknown,
  TSearchRequest extends ESSearchRequest = ESSearchRequest,
  TOptions extends {
    restTotalHitsAsInt: boolean;
  } = {
    restTotalHitsAsInt: false;
  }
> = InferSearchResponseOf<TDocument, TSearchRequest, TOptions>;
export type SearchField = estypes.QueryDslFieldAndFormat | estypes.Field;
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
