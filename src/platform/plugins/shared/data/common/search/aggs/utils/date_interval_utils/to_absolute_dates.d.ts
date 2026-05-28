import type { TimeRange } from '@kbn/es-query';
export declare function toAbsoluteDates(range: TimeRange): {
    from: Date;
    to: Date;
} | undefined;
