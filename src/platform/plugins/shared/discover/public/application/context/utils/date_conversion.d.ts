/**
 * extract nanoseconds if available in ISO timestamp
 * returns the nanos as string like this:
 * 9ns -> 000000009
 * 10000ns -> 0000010000
 * returns 000000000 for invalid timestamps or timestamps with just date
 **/
export declare function extractNanos(timeFieldValue?: string): string;
/**
 * convert an iso formatted string to number of milliseconds since
 * 1970-01-01T00:00:00.000Z
 * @param {string} isoValue
 * @returns {number}
 */
export declare function convertIsoToMillis(isoValue: string): number;
/**
 * the given time value in milliseconds is converted to a ISO formatted string
 * if nanosValue is provided, the given value replaces the fractional seconds part
 * of the formated string since moment.js doesn't support formatting timestamps
 * with a higher precision then microseconds
 * The browser rounds date nanos values:
 * 2019-09-18T06:50:12.999999999 -> browser rounds to 1568789413000000000
 * 2019-09-18T06:50:59.999999999 -> browser rounds to 1568789460000000000
 * 2017-12-31T23:59:59.999999999 -> browser rounds 1514761199999999999 to 1514761200000000000
 */
export declare function convertTimeValueToIso(timeValueMillis: number, nanosValue: string): string | null;
