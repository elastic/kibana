import type { ICollectorSet } from '../types';
export interface CollectorsStats {
    not_ready: {
        count: number;
        names: string[];
    };
    not_ready_timeout: {
        count: number;
        names: string[];
    };
    succeeded: {
        count: number;
        names: string[];
    };
    failed: {
        count: number;
        names: string[];
    };
    total_duration: number;
    total_is_ready_duration: number;
    total_fetch_duration: number;
    is_ready_duration_breakdown: Array<{
        name: string;
        duration: number;
    }>;
    fetch_duration_breakdown: Array<{
        name: string;
        duration: number;
    }>;
}
export interface CollectorsStatsCollectorParams {
    nonReadyCollectorTypes: string[];
    timedOutCollectorsTypes: string[];
    isReadyExecutionDurationByType: Array<{
        duration: number;
        type: string;
    }>;
    fetchExecutionDurationByType: Array<{
        duration: number;
        type: string;
        status: 'failed' | 'success';
    }>;
}
export declare const usageCollectorsStatsCollector: (usageCollection: Pick<ICollectorSet, "makeUsageCollector">, { nonReadyCollectorTypes, timedOutCollectorsTypes, isReadyExecutionDurationByType, fetchExecutionDurationByType, }: CollectorsStatsCollectorParams) => import("../types").ICollector<CollectorsStats, {}>;
