import type { estypes } from '@elastic/elasticsearch';
import type { InferSearchResponseOf, AggregateOf as AggregationResultOf, AggregateOfMap as AggregationResultOfMap, SearchHit, ESQLColumn, ESQLRow, ESQLSearchResponse, ESQLSearchParams, ChangePointType } from './search';
export type ESFilter = estypes.QueryDslQueryContainer;
export type ESSearchRequest = estypes.SearchRequest;
export type AggregationOptionsByType = Required<estypes.AggregationsAggregationContainer>;
export type MaybeReadonlyArray<T> = T[] | readonly T[];
export type ESSourceOptions = boolean | string | string[];
export interface ESSearchOptions {
    restTotalHitsAsInt: boolean;
}
export type ESSearchResponse<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest, TOptions extends {
    restTotalHitsAsInt: boolean;
} = {
    restTotalHitsAsInt: false;
}> = InferSearchResponseOf<TDocument, TSearchRequest, TOptions>;
export type SearchField = estypes.QueryDslFieldAndFormat | estypes.Field;
export type { InferSearchResponseOf, AggregationResultOf, AggregationResultOfMap, SearchHit, ESQLColumn, ESQLRow, ESQLSearchResponse, ESQLSearchParams, ChangePointType, };
