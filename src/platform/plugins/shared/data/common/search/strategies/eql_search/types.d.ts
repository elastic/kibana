import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { EqlSearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { TransportRequestOptions } from '@elastic/elasticsearch';
export declare const EQL_SEARCH_STRATEGY = "eql";
export type EqlRequestParams = EqlSearchRequest;
export interface EqlSearchStrategyRequest extends IKibanaSearchRequest<EqlRequestParams> {
    /**
     * @deprecated: use IAsyncSearchOptions.transport instead.
     */
    options?: TransportRequestOptions;
}
export type EqlSearchStrategyResponse<T = unknown> = IKibanaSearchResponse<T>;
