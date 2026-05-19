/**
 * Parse a timeout value to milliseconds. Supports undefined, a number, an
 * empty string, a string representing a number of minutes eg 1m, or a string
 * representing a number of seconds eg 60. All other values throw an error
 */
export declare function parseTimeoutToMs(seconds: any): number | undefined;
