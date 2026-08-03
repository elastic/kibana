import moment from 'moment';
import type { TimeRangeBounds } from '../../../../../query';
import type { EsInterval } from './calc_es_interval';
export interface TimeBucketsInterval extends moment.Duration {
    description: string;
    esValue: EsInterval['value'];
    esUnit: EsInterval['unit'];
    expression: EsInterval['expression'];
    preScaled?: TimeBucketsInterval;
    scale?: number;
    scaled?: boolean;
}
export interface TimeBucketsConfig extends Record<string, any> {
    'histogram:maxBars': number;
    'histogram:barTarget': number;
    dateFormat: string;
    'dateFormat:scaled': string[][];
}
/**
 * Helper class for wrapping the concept of an "Interval",
 * which describes a timespan that will separate moments.
 *
 * @param {state} object - one of ""
 * @param {[type]} display [description]
 */
export declare class TimeBuckets {
    private _timeBucketConfig;
    private _lb;
    private _ub;
    private _originalInterval;
    private _i?;
    [key: string]: any;
    constructor(timeBucketConfig: TimeBucketsConfig);
    /**
     * Get a moment duration object representing
     * the distance between the bounds, if the bounds
     * are set.
     *
     * @return {moment.duration|undefined}
     */
    private getDuration;
    /**
     * Set the bounds that these buckets are expected to cover.
     * This is required to support interval "auto" as well
     * as interval scaling.
     *
     * @param {object} input - an object with properties min and max,
     *                       representing the edges for the time span
     *                       we should cover
     *
     * @returns {undefined}
     */
    setBounds(input?: TimeRangeBounds | TimeRangeBounds[]): void;
    /**
     * Clear the stored bounds
     *
     * @return {undefined}
     */
    clearBounds(): void;
    /**
     * Check to see if we have received bounds yet
     *
     * @return {Boolean}
     */
    hasBounds(): boolean;
    /**
     * Return the current bounds, if we have any.
     *
     * THIS DOES NOT CLONE THE BOUNDS, so editing them
     * may have unexpected side-effects. Always
     * call bounds.min.clone() before editing
     *
     * @return {object|undefined} - If bounds are not defined, this
     *                      returns undefined, else it returns the bounds
     *                      for these buckets. This object has two props,
     *                      min and max. Each property will be a moment()
     *                      object
     *
     */
    getBounds(): TimeRangeBounds | undefined;
    /**
     * Update the interval at which buckets should be
     * generated.
     *
     * Input can be one of the following:
     *  - Any object from src/legacy/ui/agg_types.js
     *  - "auto"
     *  - Pass a valid moment unit
     *
     * @param {object|string|moment.duration} input - see desc
     */
    setInterval(input: null | string | Record<string, any>): void;
    /**
     * Get the interval for the buckets. If the
     * number of buckets created by the interval set
     * is larger than config:histogram:maxBars then the
     * interval will be scaled up. If the number of buckets
     * created is less than one, the interval is scaled back.
     *
     * The interval object returned is a moment.duration
     * object that has been decorated with the following
     * properties.
     *
     * interval.description: a text description of the interval.
     *   designed to be used list "field per {{ desc }}".
     *     - "minute"
     *     - "10 days"
     *     - "3 years"
     *
     * interval.expression: the elasticsearch expression that creates this
     *   interval. If the interval does not properly form an elasticsearch
     *   expression it will be forced into one.
     *
     * interval.scaled: the interval was adjusted to
     *   accommodate the maxBars setting.
     *
     * interval.scale: the number that y-values should be
     *   multiplied by
     */
    getInterval(useNormalizedEsInterval?: boolean): TimeBucketsInterval;
    /**
     * Get a date format string that will represent dates that
     * progress at our interval.
     *
     * Since our interval can be as small as 1ms, the default
     * date format is usually way too much. with `dateFormat:scaled`
     * users can modify how dates are formatted within series
     * produced by TimeBuckets
     *
     * @return {string}
     */
    getScaledDateFormat(): string;
}
