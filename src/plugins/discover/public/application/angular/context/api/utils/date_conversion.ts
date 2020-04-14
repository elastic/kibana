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

import moment from 'moment';
/**
 * extract nanoseconds if available in ISO timestamp
 * returns the nanos as string like this:
 * 9ns -> 000000009
 * 10000ns -> 0000010000
 * returns 000000000 for invalid timestamps or timestamps with just date
 **/
export function extractNanos(timeFieldValue: string = ''): string {
  const fieldParts = timeFieldValue.split('.');
  const fractionSeconds = fieldParts.length === 2 ? fieldParts[1].replace('Z', '') : '';
  return fractionSeconds.length !== 9 ? fractionSeconds.padEnd(9, '0') : fractionSeconds;
}

/**
 * extract the nanoseconds as string of a given ISO formatted timestamp
 */
export function convertIsoToNanosAsStr(isoValue: string): string {
  const nanos = extractNanos(isoValue);
  const millis = convertIsoToMillis(isoValue);
  return `${millis}${nanos.substr(3, 6)}`;
}

/**
 * convert an iso formatted string to number of milliseconds since
 * 1970-01-01T00:00:00.000Z
 * @param {string} isoValue
 * @returns {number}
 */
export function convertIsoToMillis(isoValue: string): number {
  const date = new Date(isoValue);
  return date.getTime();
}
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
export function convertTimeValueToIso(timeValueMillis: number, nanosValue: string): string | null {
  if (!timeValueMillis) {
    return null;
  }
  const isoString = moment(timeValueMillis).toISOString();
  if (!isoString) {
    return null;
  } else if (nanosValue !== '') {
    return `${isoString.substring(0, isoString.length - 4)}${nanosValue}Z`;
  }
  return isoString;
}
