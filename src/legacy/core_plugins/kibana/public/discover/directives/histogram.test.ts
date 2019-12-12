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

import { findMinInterval } from './histogram';
import moment from 'moment-timezone';

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
describe('DiscoverHistogram', () => {
  it('shall find the min interval with a single unit, single value', () => {
    const oneMs = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneMs], 1, 'ms', 'UTC')).toBe(1);

    const oneSecond = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneSecond], 1, 's', 'UTC')).toBe(1000);

    // all are calendar intervals
    const oneMinute = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneMinute], 1, 'm', 'UTC')).toBe(1000 * 60);

    const oneHour = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneHour], 1, 'h', 'UTC')).toBe(ONE_HOUR);

    const oneDay = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneDay], 1, 'd', 'UTC')).toBe(ONE_DAY);

    const oneWeek = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneWeek], 1, 'w', 'UTC')).toBe(7 * ONE_DAY);

    const oneMonth = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneMonth], 1, 'M', 'UTC')).toBe(29 * ONE_DAY);

    const oneYear = moment('2015-01-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneYear], 1, 'y', 'UTC')).toBe(365 * ONE_DAY);

    const oneLeapYear = moment('2016-01-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([oneLeapYear], 1, 'y', 'UTC')).toBe(366 * ONE_DAY);
  });

  it('shall find the min interval with a single unit, single value DST', () => {
    // if configured timeZone is UTC, there is no DST
    const utcDay = moment('2019-03-31T00:00:00.000Z').valueOf();
    expect(findMinInterval([utcDay], 1, 'd', 'UTC')).toBe(ONE_DAY);

    const dstDay = moment.tz('2019-03-31 00:00:00.000', 'Europe/Rome').valueOf();
    expect(findMinInterval([dstDay], 1, 'd', 'Europe/Rome')).toBe(ONE_DAY - ONE_HOUR);

    const dstAddDay = moment.tz('2019-10-27 00:00:00.000', 'Europe/Rome').valueOf();
    // the 27th has 25 hours
    expect(findMinInterval([dstAddDay], 1, 'd', 'Europe/Rome')).toBe(ONE_DAY + ONE_HOUR);
  });

  it('shall find the min interval with a single unit, multi value DST', () => {
    // if configured timeZone is UTC, there is no DST
    const utcStartDay = moment('2019-03-31T00:00:00.000Z').valueOf();
    const utcEndDay = moment('2019-04-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([utcStartDay, utcEndDay], 1, 'd', 'UTC')).toBe(ONE_DAY);

    const dstStartDay = moment.tz('2019-03-31 00:00:00.000', 'Europe/Rome').valueOf();
    const dstEndDay = moment.tz('2019-04-01 00:00:00.000', 'Europe/Rome').valueOf();
    expect(findMinInterval([dstStartDay, dstEndDay], 1, 'd', 'Europe/Rome')).toBe(
      ONE_DAY - ONE_HOUR
    );

    const dstAddStartDay = moment.tz('2019-10-27 00:00:00.000', 'Europe/Rome').valueOf();
    const dstAddEndDay = moment.tz('2019-10-28 00:00:00.000', 'Europe/Rome').valueOf();
    // the 27th has 25 hours and the 28 has 24 hours, so the min is 24
    expect(findMinInterval([dstAddStartDay, dstAddEndDay], 1, 'd', 'Europe/Rome')).toBe(ONE_DAY);
  });

  it('shall find the min interval with a multi unit, single value', () => {
    // all are fixed intervals
    const fiveMs = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([fiveMs], 5, 'ms', 'UTC')).toBe(5);

    const fiveSecond = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([fiveSecond], 5, 's', 'UTC')).toBe(1000 * 5);

    const fiveMinute = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([fiveMinute], 5, 'm', 'UTC')).toBe(1000 * 60 * 5);

    const fiveHour = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([fiveHour], 5, 'h', 'UTC')).toBe(ONE_HOUR * 5);

    const fiveDay = moment('2016-02-01T00:00:00.000Z').valueOf();
    expect(findMinInterval([fiveDay], 5, 'd', 'UTC')).toBe(ONE_DAY * 5);

    // multiple week, month and years are not allowed see parse_es_interval.ts
  });
});
