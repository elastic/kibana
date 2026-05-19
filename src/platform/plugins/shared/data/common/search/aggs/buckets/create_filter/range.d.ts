import type { AggTypesDependencies } from '../../agg_types';
import type { IBucketAggConfig } from '../bucket_agg_type';
/** @internal */
export declare const createFilterRange: (getFieldFormatsStart: AggTypesDependencies["getFieldFormatsStart"]) => (aggConfig: IBucketAggConfig, { label, ...params }: any) => import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter;
