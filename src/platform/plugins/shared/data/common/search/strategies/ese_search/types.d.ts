import type { SearchSourceSearchOptions } from '../../search_source/types';
export declare const ENHANCED_ES_SEARCH_STRATEGY = "ese";
export interface IAsyncSearchOptions extends SearchSourceSearchOptions {
    /**
     * The number of milliseconds to wait between receiving a response and sending another request
     * If not provided, then a default 1 second interval with back-off up to 5 seconds interval is used
     */
    pollInterval?: number;
}
