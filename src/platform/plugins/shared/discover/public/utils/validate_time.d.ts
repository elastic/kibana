import type { RefreshInterval } from '@kbn/data-plugin/common';
export declare function isTimeRangeValid(timeRange?: {
    from: string;
    to: string;
}): boolean;
export declare function isRefreshIntervalValid(refreshInterval?: RefreshInterval): boolean;
