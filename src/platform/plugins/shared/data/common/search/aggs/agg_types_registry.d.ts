import type { BucketAggType } from './buckets/bucket_agg_type';
import type { MetricAggType } from './metrics/metric_agg_type';
import type { AggTypesDependencies } from './agg_types';
export type AggTypesRegistrySetup = ReturnType<AggTypesRegistry['setup']>;
export type AggTypesRegistryStart = ReturnType<AggTypesRegistry['start']>;
export declare class AggTypesRegistry {
    private readonly bucketAggs;
    private readonly metricAggs;
    private readonly legacyAggs;
    setup: () => {
        registerBucket: <N extends string, T extends (deps: AggTypesDependencies) => BucketAggType<any>>(name: N, type: T) => void;
        registerMetric: <N extends string, T extends (deps: AggTypesDependencies) => MetricAggType<any>>(name: N, type: T) => void;
        registerLegacy: <N extends string, T extends (deps: AggTypesDependencies) => BucketAggType<any> | MetricAggType<any>>(name: N, type: T) => void;
    };
    start: (aggTypesDependencies: AggTypesDependencies) => {
        get: (name: string) => BucketAggType<any> | MetricAggType<any> | undefined;
        getAll: () => {
            buckets: BucketAggType<any>[];
            metrics: MetricAggType<any>[];
        };
    };
}
