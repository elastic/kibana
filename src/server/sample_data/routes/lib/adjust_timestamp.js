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


const MILLISECONDS_IN_DAY = 86400000;

/**
 * Convert timestamp to timestamp that is relative to now
 *
 * @param {String} timestamp ISO8601 formated data string YYYY-MM-dd'T'HH:mm:ss.SSS
 * @param {Date} currentTimeMarker "now" reference marker in sample dataset
 * @param {Date} now
 * @param {Boolean} preserveDayOfWeekTimeOfDay
 * @return {String} ISO8601 formated data string YYYY-MM-dd'T'HH:mm:ss.SSS of timestamp adjusted to now
 */
export function adjustTimestamp(timestamp, currentTimeMarker, now, preserveDayOfWeekTimeOfDay) {
  const timestampDate = new Date(Date.parse(timestamp));

  if (!preserveDayOfWeekTimeOfDay) {
    // Move timestamp relative to now, preserving distance between currentTimeMarker and timestamp
    const timeDelta = timestampDate.getTime() - currentTimeMarker.getTime();
    return (new Date(now.getTime() + timeDelta)).toISOString();
  }

  // Move timestamp to current week, preserving day of week and time of day
  const weekDelta = Math.round((timestampDate.getTime() - currentTimeMarker.getTime()) / (MILLISECONDS_IN_DAY * 7));
  const dayOfWeekDelta = timestampDate.getDay() - now.getDay();
  const daysDelta = dayOfWeekDelta * MILLISECONDS_IN_DAY + (weekDelta * MILLISECONDS_IN_DAY * 7);
  const yearMonthDay = (new Date(now.getTime() + daysDelta)).toISOString().substring(0, 10);
  return `${yearMonthDay}T${timestamp.substring(11)}`;

}
