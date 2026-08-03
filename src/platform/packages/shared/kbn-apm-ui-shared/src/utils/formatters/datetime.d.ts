import moment from 'moment-timezone';
export type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
type DateUnit = 'days' | 'months' | 'years';
export declare const getDateDifference: ({ start, end, unitOfTime, precise, }: {
    start: moment.Moment;
    end: moment.Moment;
    unitOfTime: DateUnit | TimeUnit;
    precise?: boolean;
}) => number;
export declare function asAbsoluteDateTime(
/**
 * timestamp in milliseconds or ISO timestamp
 */
time: number | string, timeUnit?: TimeUnit): string;
export {};
