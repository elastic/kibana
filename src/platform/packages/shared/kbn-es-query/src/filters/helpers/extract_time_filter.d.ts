import type { Filter, RangeFilter } from '../build_filters';
import type { TimeRange } from './types';
export declare function extractTimeFilter(timeFieldName: string, filters: Filter[]): {
    restOfFilters: Filter[];
    timeRangeFilter?: RangeFilter;
};
export declare function extractTimeRange(filters: Filter[], timeFieldName?: string): {
    restOfFilters: Filter[];
    timeRange?: TimeRange;
};
