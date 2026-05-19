type Interval = {
    fixed_interval: string;
} | {
    calendar_interval: string;
};
/**
 * Checks whether a given Elasticsearch interval is a calendar or fixed interval
 * and returns an object containing the appropriate date_histogram property for that
 * interval. So it will return either an object containing the fixed_interval key for
 * that interval or a calendar_interval. If the specified interval was not a valid Elasticsearch
 * interval this method will throw an error.
 *
 * You can simply spread the returned value of this method into your date_histogram.
 * @example
 * const aggregation = {
 *   date_histogram: {
 *     field: 'date',
 *     ...dateHistogramInterval('24h'),
 *   }
 * };
 *
 * @param interval The interval string to return the appropriate date_histogram key for.
 */
export declare function dateHistogramInterval(interval: string, shouldForceFixed?: boolean): Interval;
export {};
