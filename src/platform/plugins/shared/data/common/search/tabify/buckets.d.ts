import type { IAggConfig } from '../aggs';
import type { TimeRangeInformation } from './types';
export declare class TabifyBuckets {
    length: number;
    objectMode: boolean;
    buckets: any;
    _keys: any[];
    constructor(aggResp: any, agg?: IAggConfig, timeRange?: TimeRangeInformation);
    forEach(fn: (bucket: any, key: any) => void): void;
    private orderBucketsAccordingToParams;
    private dropPartials;
}
