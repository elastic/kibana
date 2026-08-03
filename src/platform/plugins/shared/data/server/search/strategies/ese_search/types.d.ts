import type { AsyncSearchGetRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchRequestParams } from '@kbn/search-types';
export interface IAsyncSearchRequestParams extends ISearchRequestParams {
    keep_alive?: AsyncSearchGetRequest['keep_alive'];
    wait_for_completion_timeout?: AsyncSearchGetRequest['wait_for_completion_timeout'];
}
export interface AsyncSearchResponse<T = unknown> {
    id?: string;
    response: SearchResponse<T>;
    start_time_in_millis: number;
    expiration_time_in_millis: number;
    is_partial: boolean;
    is_running: boolean;
}
