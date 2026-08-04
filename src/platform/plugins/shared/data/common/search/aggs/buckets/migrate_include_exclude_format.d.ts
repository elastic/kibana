import type { IBucketAggConfig, BucketAggParam } from './bucket_agg_type';
import type { IAggConfig } from '../agg_config';
export declare const isType: (...types: string[]) => (agg: IAggConfig) => boolean;
export declare const isNumberType: (agg: IAggConfig) => boolean;
export declare const isStringType: (agg: IAggConfig) => boolean;
export declare const isStringOrNumberType: (agg: IAggConfig) => boolean;
export declare const migrateIncludeExcludeFormat: Partial<BucketAggParam<IBucketAggConfig>>;
