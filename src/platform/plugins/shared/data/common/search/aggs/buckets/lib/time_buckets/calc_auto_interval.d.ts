import moment from 'moment';
export declare const boundsDescendingRaw: ({
    bound: number;
    interval: moment.Duration;
    boundLabel: string;
    intervalLabel: string;
} | {
    bound: moment.Duration;
    interval: moment.Duration;
    boundLabel: string;
    intervalLabel: string;
})[];
/**
 * Using some simple rules we pick a "pretty" interval that will
 * produce around the number of buckets desired given a time range.
 *
 * @param targetBucketCount desired number of buckets
 * @param duration time range the agg covers
 */
export declare function calcAutoIntervalNear(targetBucketCount: number, duration: number): moment.Duration;
/**
 * Pick a "pretty" interval that produces no more than the maxBucketCount
 * for the given time range.
 *
 * @param maxBucketCount maximum number of buckets to create
 * @param duration amount of time covered by the agg
 */
export declare function calcAutoIntervalLessThan(maxBucketCount: number, duration: number): moment.Duration;
