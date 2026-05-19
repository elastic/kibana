import type { IBucketAggConfig } from './bucket_agg_type';
export declare const autoInterval = "auto";
export declare const isAutoInterval: (value: unknown) => value is "auto";
export declare const intervalOptions: ({
    display: string;
    val: string;
    enabled(agg: IBucketAggConfig): boolean;
} | {
    display: string;
    val: string;
    enabled?: undefined;
})[];
