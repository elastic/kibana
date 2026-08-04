import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
export interface ChangePointChartSectionActions {
    openInNewTab?: (params: {
        query?: Query | AggregateQuery;
        tabLabel?: string;
        timeRange?: TimeRange;
    }) => void;
    updateESQLQuery?: (queryOrUpdater: string | ((prevQuery: string) => string)) => void;
}
/** Props for the Discover chart section (lazy bundle). Chart data comes from `fetchParams.query` and `fetchParams.table`. */
export type UnifiedChangePointGridProps = ChartSectionProps & {
    actions?: ChangePointChartSectionActions;
};
