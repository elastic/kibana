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


function iso8601ToDateIgnoringTime(iso8601) {
  const split = iso8601.split('-');
  const year = parseInt(split[0]);
  const month = parseInt(split[1]) - 1; // javascript months are zero-based indexed
  const date = parseInt(split[2]);
  return new Date(year, month, date);
}

function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

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
  if (!preserveDayOfWeekTimeOfDay) {
    // Move timestamp relative to now, preserving distance between currentTimeMarker and timestamp
    const timestampDate = new Date(Date.parse(timestamp));
    const timeDelta = timestampDate.getTime() - currentTimeMarker.getTime();
    return (new Date(now.getTime() + timeDelta)).toISOString();
  }

  // Move timestamp to current week, preserving day of week and time of day
  const timestampDateOnly = iso8601ToDateIgnoringTime(timestamp);
  const nowDateOnly = toDateOnly(now);
  const currentTimeMarkerDateOnly = toDateOnly(currentTimeMarker);

  let partialWeek = 0;
  if (timestampDateOnly.getDay() > currentTimeMarkerDateOnly.getDay()
    && timestampDateOnly.getTime() < currentTimeMarkerDateOnly.getTime()) {
    partialWeek = 1;
  }
  const unroundedWeekDelta = (timestampDateOnly.getTime() - currentTimeMarkerDateOnly.getTime()) / (MILLISECONDS_IN_DAY * 7);
  const weekDelta = partialWeek + Math.floor(Math.abs(unroundedWeekDelta));
  const weekDirection = timestampDateOnly.getTime() < currentTimeMarkerDateOnly.getTime() ? -1 : 1;

  const dayOfWeekDelta = timestampDateOnly.getDay() - nowDateOnly.getDay();
  const daysDeltaInMS = dayOfWeekDelta * MILLISECONDS_IN_DAY + (weekDirection * weekDelta * MILLISECONDS_IN_DAY * 7);

  const adjustedTimestamp = (new Date(nowDateOnly.getTime() + daysDeltaInMS));
  const year = adjustedTimestamp.getFullYear();
  const month = adjustedTimestamp.getMonth() + 1;
  const monthString = month < 10 ? `0${month}` : `${month}`;
  const dateString = adjustedTimestamp.getDate() < 10 ? `0${adjustedTimestamp.getDate()}` : `${adjustedTimestamp.getDate()}`;
  return `${year}-${monthString}-${dateString}T${timestamp.substring(11)}`;
}
