import type { Dimension, MetricsSort, UnifiedMetricsGridProps } from '../../../../types';
export declare function useRecentlyExploredMetrics({ getRecentlyExploredMetrics, discoverFetch$, metricsSort, searchTerm, selectedDimensions, }: {
    getRecentlyExploredMetrics?: () => readonly string[];
    discoverFetch$?: UnifiedMetricsGridProps['fetch$'];
    metricsSort: MetricsSort;
    searchTerm: string;
    selectedDimensions: Dimension[];
}): readonly string[];
