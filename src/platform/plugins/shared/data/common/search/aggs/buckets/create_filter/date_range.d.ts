import type { DateRange } from '../../../expressions';
import type { IBucketAggConfig } from '../bucket_agg_type';
export declare const createFilterDateRange: (agg: IBucketAggConfig, { from, to }: DateRange) => import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter;
