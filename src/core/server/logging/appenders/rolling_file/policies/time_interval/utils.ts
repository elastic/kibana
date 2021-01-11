/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
