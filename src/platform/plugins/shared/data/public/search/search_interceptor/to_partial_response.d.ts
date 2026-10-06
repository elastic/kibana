import type { IEsSearchResponse } from '@kbn/search-types';
/**
 * When we hit the advanced setting `search:timeout`, we cancel in-progress search requests. This method takes the
 * active raw response from ES (status: "running") and returns a request in the format expected by our helper utilities
 * (status: "partial") that display cluster info, warnings, & errors.
 * @param response The raw ES response
 */
export declare function toPartialResponseAfterTimeout(response: IEsSearchResponse): IEsSearchResponse;
