/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Duration, unitOfTime } from 'moment-timezone';

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
export const getHighestTimeUnit = (duration: Duration): unitOfTime.Base => {
  if (duration.asYears() >= 1) {
    return 'year';
  }
  if (duration.asMonths() >= 1) {
    return 'month';
  }
  if (duration.asWeeks() >= 1) {
    return 'week';
  }
  if (duration.asDays() >= 1) {
    return 'day';
  }
  if (duration.asHours() >= 1) {
    return 'hour';
  }
  if (duration.asMinutes() >= 1) {
    return 'minute';
  }
  if (duration.asSeconds() >= 1) {
    return 'second';
  }
  return 'millisecond';
};

/**
 * Returns true if the given duration is valid to be used with by the {@link TimeIntervalTriggeringPolicy | policy}
 *
 * See {@link TimeIntervalTriggeringPolicyConfig.interval} for rules and reasons around this validation.
 */
export const isValidRolloverInterval = (duration: Duration): boolean => {
  const highestUnit = getHighestTimeUnit(duration);
  const asHighestUnit = duration.as(highestUnit);
  return Number.isInteger(asHighestUnit);
};
