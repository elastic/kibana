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

import moment, { Duration, unitOfTime } from 'moment-timezone';

/**
 * Return the next potential rollover time, given current time and rollover interval
 */
export const getNextRollingTime = (
  currentTime: number,
  interval: Duration,
  modulate: boolean
): number => {
  if (modulate) {
    const field = getHighestField(interval);
    const currentMoment = moment(currentTime);
    const increment = interval.get(field) - (currentMoment.get(field) % interval.get(field));
    const incrementInMs = moment.duration(increment, field).asMilliseconds();
    return currentMoment.startOf(field).toDate().getTime() + incrementInMs;
  } else {
    return currentTime + interval.asMilliseconds();
  }
};

const getHighestField = (duration: Duration): unitOfTime.Base => {
  if (duration.asYears() >= 1) {
    return 'year';
  }
  if (duration.asMonths() >= 1) {
    return 'month';
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
