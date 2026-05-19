import type { SearchSourceSearchOptions } from '../../search_source/types';
export declare const ENHANCED_ES_SEARCH_STRATEGY = "ese";
export interface IAsyncSearchOptions extends SearchSourceSearchOptions {
    /**
     * The number of milliseconds to wait between receiving a response and sending another request
     * If not provided, then it defaults to 0 (no wait time)
     */
    pollInterval?: number;
    /**
     * The length of time to wait for results before initiating a new poll request.
     */
    pollLength?: string;
}
