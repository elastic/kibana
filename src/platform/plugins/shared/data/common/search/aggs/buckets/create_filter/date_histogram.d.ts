import type { IBucketDateHistogramAggConfig } from '../date_histogram';
export declare const createFilterDateHistogram: (agg: IBucketDateHistogramAggConfig, key: string | number) => import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter;
