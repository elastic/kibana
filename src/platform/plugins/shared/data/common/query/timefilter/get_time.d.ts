import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRangeBounds } from '../..';
export interface CalculateBoundsOptions {
    forceNow?: Date;
}
export declare function calculateBounds(timeRange: TimeRange, options?: CalculateBoundsOptions): TimeRangeBounds;
export declare function getAbsoluteTimeRange(timeRange: TimeRange, { forceNow }?: {
    forceNow?: Date;
}): TimeRange;
export declare function getTime(indexPattern: DataView | undefined, timeRange: TimeRange, options?: {
    forceNow?: Date;
    fieldName?: string;
}): import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter | undefined;
export declare function getRelativeTime(indexPattern: DataView | undefined, timeRange: TimeRange, options?: {
    forceNow?: Date;
    fieldName?: string;
}): import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter | undefined;
