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

/**
 * Returns a date that is the specified interval from now. Currently,
 * only minute-intervals are supported.
 *
 * @param {string} interval - An interval of the form `Nm` such as `5m`
 */
export function intervalFromNow(interval?: string): Date | undefined {
  if (interval === undefined) {
    return;
  }

  assertValidInterval(interval);

  return minutesFromNow(parseInterval(interval));
}

/**
 * Returns a date that is mins minutes from now.
 *
 * @param mins The number of mintues from now
 */
export function minutesFromNow(mins: number): Date {
  const now = new Date();

  now.setMinutes(now.getMinutes() + mins);

  return now;
}

/**
 * Verifies that the specified interval matches our expected format.
 *
 * @param {string} interval - An interval such as `5m`
 */
export function assertValidInterval(interval: string) {
  if (/^[0-9]+m$/.test(interval)) {
    return interval;
  }

  throw new Error(
    `Invalid interval "${interval}". Intervals must be of the form {numbrer}m. Example: 5m.`
  );
}

function parseInterval(interval: string) {
  return parseInt(interval, 10);
}
