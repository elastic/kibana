import type { IUiSettingsClient } from '@kbn/core/server';
import type { AsyncSearchGetRequest } from '@elastic/elasticsearch/lib/api/types';
import type { AsyncSearchSubmitRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchOptions } from '@kbn/search-types';
import type { SearchConfigSchema } from '../../../config';
/**
 * @internal
 */
export declare function getIgnoreThrottled(uiSettingsClient: Pick<IUiSettingsClient, 'get'>): Promise<{
    ignore_throttled?: boolean;
}>;
/**
 @internal
 */
export declare function getDefaultAsyncSubmitParams(uiSettingsClient: Pick<IUiSettingsClient, 'get'>, searchConfig: SearchConfigSchema, options: ISearchOptions, { isServerless, isPit }?: {
    isServerless?: boolean | undefined;
    isPit?: boolean | undefined;
}): Promise<Pick<AsyncSearchSubmitRequest, 'batched_reduce_size' | 'ccs_minimize_roundtrips' | 'keep_alive' | 'wait_for_completion_timeout' | 'ignore_throttled' | 'max_concurrent_shard_requests' | 'ignore_unavailable' | 'track_total_hits' | 'keep_on_completion'> & {
    project_routing?: string;
}>;
/**
 @internal
 */
export declare function getDefaultAsyncGetParams(searchConfig: SearchConfigSchema, options: ISearchOptions): Pick<AsyncSearchGetRequest, 'keep_alive' | 'wait_for_completion_timeout'>;
