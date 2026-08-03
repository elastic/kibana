import type { estypes } from '@elastic/elasticsearch';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from './kibana_search_types';
export type ISearchRequestParams = {
    trackTotalHits?: boolean;
} & estypes.SearchRequest;
export interface IEsSearchRequest<T extends ISearchRequestParams = ISearchRequestParams> extends IKibanaSearchRequest<T> {
    indexType?: string;
}
export type IEsSearchResponse<Source = any> = IKibanaSearchResponse<estypes.SearchResponse<Source>>;
