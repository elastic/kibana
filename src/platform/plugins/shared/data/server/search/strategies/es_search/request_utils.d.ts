import type { estypes } from '@elastic/elasticsearch';
import type { IUiSettingsClient, SharedGlobalConfig } from '@kbn/core/server';
export declare function getShardTimeout(config: SharedGlobalConfig): Pick<estypes.SearchRequest, 'timeout'>;
export declare function getDefaultSearchParams(uiSettingsClient: Pick<IUiSettingsClient, 'get'>, options?: {
    isPit: boolean;
}): Promise<{
    max_concurrent_shard_requests?: number;
    ignore_unavailable?: boolean;
    track_total_hits: boolean;
}>;
