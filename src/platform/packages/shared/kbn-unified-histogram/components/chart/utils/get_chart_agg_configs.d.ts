import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
/**
 * Helper function to get the agg configs required for the Unified Histogram chart request
 */
export declare function getChartAggConfigs({ dataView, timeInterval, timeRange, data, }: {
    dataView: DataView;
    timeInterval: string;
    timeRange: TimeRange;
    data: DataPublicPluginStart;
}): import("@kbn/data-plugin/public").AggConfigs;
