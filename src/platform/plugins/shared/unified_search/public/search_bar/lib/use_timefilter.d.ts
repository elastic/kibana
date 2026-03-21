import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';
interface UseTimefilterProps {
    disabled?: boolean;
    dateRangeFrom?: string;
    dateRangeTo?: string;
    refreshInterval?: number;
    isRefreshPaused?: boolean;
    timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];
}
export declare const useTimefilter: (props: UseTimefilterProps) => {
    refreshInterval: Readonly<{} & {
        value: number;
        pause: boolean;
    }>;
    timeRange: TimeRange;
    minRefreshInterval: number;
};
export {};
