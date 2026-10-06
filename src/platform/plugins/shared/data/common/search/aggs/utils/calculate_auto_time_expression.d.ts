import type { TimeBucketsInterval } from '../buckets/lib/time_buckets/time_buckets';
import type { TimeRange } from '../../../query';
export declare function getCalculateAutoTimeExpression(getConfig: (key: string) => any): {
    (range: TimeRange): string | undefined;
    (range: TimeRange, interval: string, asExpression?: true): string | undefined;
    (range: TimeRange, interval: string, asExpression: false): TimeBucketsInterval | undefined;
    (range: TimeRange, interval?: string, asExpression?: boolean): string | TimeBucketsInterval | undefined;
};
