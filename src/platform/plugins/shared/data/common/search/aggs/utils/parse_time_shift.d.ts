import moment from 'moment';
import type { TimeRange } from '../../../types';
declare const INVALID_DATE = "invalid";
declare const PREVIOUS_DATE = "previous";
type PreviousDateType = typeof PREVIOUS_DATE;
type InvalidDateType = typeof INVALID_DATE;
/**
 * This method parses a string into a time shift duration.
 * If parsing fails, 'invalid' is returned.
 * Allowed values are the string 'previous' and an integer followed by the units s,m,h,d,w,M,y
 *  */
export declare const parseTimeShift: (val: string) => moment.Duration | PreviousDateType | InvalidDateType;
/**
 * Check function to detect an absolute time shift.
 * The check is performed only on the string format and the timestamp is not validated:
 * use the validateAbsoluteTimeShift fucntion to perform more in depth checks
 * @param val the string to parse (it assumes it has been trimmed already)
 * @returns true if an absolute time shift
 */
export declare const isAbsoluteTimeShift: (val?: string) => boolean;
export declare const REASON_IDS: {
    readonly missingTimerange: "missingTimerange";
    readonly notAbsoluteTimeShift: "notAbsoluteTimeShift";
    readonly invalidDate: "invalidDate";
    readonly shiftAfterTimeRange: "shiftAfterTimeRange";
};
export type REASON_ID_TYPES = keyof typeof REASON_IDS;
/**
 * Parses an absolute time shift string and returns its equivalent duration
 * @param val the string to parse
 * @param timeRange the current date histogram interval
 * @returns
 */
export declare const parseAbsoluteTimeShift: (val: string, timeRange: TimeRange | undefined) => {
    value: moment.Duration;
    reason: null;
} | {
    value: InvalidDateType;
    reason: REASON_ID_TYPES;
};
/**
 * Relaxed version of the parsing validation
 * This version of the validation applies the timeRange validation only when passed
 * @param val
 * @param timeRange
 * @returns the reason id if the absolute shift is not valid, undefined otherwise
 */
export declare function validateAbsoluteTimeShift(val: string, timeRange?: TimeRange): REASON_ID_TYPES | undefined;
export {};
