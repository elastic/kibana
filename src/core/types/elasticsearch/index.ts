/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { InferSearchResponseOf, AggregateOf as AggregationResultOf, SearchHit } from './search';

export type ESFilter = estypes.QueryDslQueryContainer;
export type ESSearchRequest = estypes.SearchRequest;
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

export type { InferSearchResponseOf, AggregationResultOf, SearchHit };
