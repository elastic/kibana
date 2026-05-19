import type { ISearchRequestParams } from '@kbn/search-types';
import type { GetConfigFn } from '../../../types';
import type { SearchRequest } from './types';
export declare function getEsPreference(getConfigFn: GetConfigFn, sessionId?: string): SearchRequest['preference'];
/** @public */
export declare function getSearchParamsFromRequest(searchRequest: SearchRequest, dependencies: {
    getConfig: GetConfigFn;
}): ISearchRequestParams;
