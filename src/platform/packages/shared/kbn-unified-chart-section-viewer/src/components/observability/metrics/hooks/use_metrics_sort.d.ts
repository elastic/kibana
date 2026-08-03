import type { MetricsSortBy, MetricsSortDirection, ParsedMetricItem } from '../../../../types';
export declare const useMetricsSort: ({ metricItems, sortBy, direction, recentlyExploredMetrics, }: {
    metricItems: ParsedMetricItem[];
    sortBy: MetricsSortBy;
    direction: MetricsSortDirection;
    recentlyExploredMetrics?: readonly string[];
}) => {
    sortedMetricItems: ParsedMetricItem[];
};
