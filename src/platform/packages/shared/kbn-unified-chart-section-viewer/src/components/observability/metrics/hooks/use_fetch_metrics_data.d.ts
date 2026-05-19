import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { Dimension, MetricsInfo } from '../../../../types';
/**
 * Fetches METRICS_INFO when in Metrics Experience (non-transformational ES|QL, chart visible).
 * When selectedDimensionNames is non-empty, refetches with a WHERE filter so only
 * metrics that have all of the selected dimensions are returned.
 * Returns loading state, error, and parsed metrics info for the grid.
 */
export declare function useFetchMetricsData({ fetchParams, services, isComponentVisible, selectedDimensionNames, }: {
    fetchParams: ChartSectionProps['fetchParams'];
    services: ChartSectionProps['services'];
    isComponentVisible: boolean;
    selectedDimensionNames?: Dimension[];
}): MetricsInfo;
