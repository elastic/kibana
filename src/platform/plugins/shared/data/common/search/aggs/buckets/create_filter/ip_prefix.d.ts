import type { IBucketAggConfig } from '../bucket_agg_type';
import type { IpPrefixKey } from '../lib/ip_prefix';
export declare const createFilterIpPrefix: (aggConfig: IBucketAggConfig, key: IpPrefixKey) => import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter;
