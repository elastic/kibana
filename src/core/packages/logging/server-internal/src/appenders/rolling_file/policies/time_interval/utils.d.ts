import type { Duration, unitOfTime } from 'moment-timezone';
/**
 * Returns the highest time unit of the given duration
 * (the highest unit with a value higher of equal to 1)
 *
 * @example
 * ```
 * getHighestTimeUnit(moment.duration(4, 'day'))
 * // 'day'
 * getHighestTimeUnit(moment.duration(90, 'minute'))
 * // 'hour' - 90min = 1.5h
 * getHighestTimeUnit(moment.duration(30, 'minute'))
 * // 'minute' - 30min = 0,5h
 * ```
 */
export declare const getHighestTimeUnit: (duration: Duration) => unitOfTime.Base;
/**
 * Returns true if the given duration is valid to be used with by the {@link TimeIntervalTriggeringPolicy | policy}
 *
 * See {@link TimeIntervalTriggeringPolicyConfig.interval} for rules and reasons around this validation.
 */
export declare const isValidRolloverInterval: (duration: Duration) => boolean;
