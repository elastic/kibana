import type { IBucketAggConfig } from '../bucket_agg_type';
import type { IpRangeKey } from '../lib/ip_range';
export declare const createFilterIpRange: (aggConfig: IBucketAggConfig, key: IpRangeKey) => import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter;
