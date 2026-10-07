/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';

import type { TimeBucketsConfig } from './time_buckets';
import { TimeBuckets } from './time_buckets';
import { autoInterval } from '../../_interval_options';
import { InvalidEsCalendarIntervalError } from '../../../utils';

describe('TimeBuckets', () => {
  const timeBucketConfig: TimeBucketsConfig = {
    'histogram:maxBars': 4,
    'histogram:barTarget': 3,
    dateFormat: 'YYYY-MM-DD',
    'dateFormat:scaled': [
      ['', 'HH:mm:ss.SSS'],
      ['PT1S', 'HH:mm:ss'],
      ['PT1M', 'HH:mm'],
      ['PT1H', 'YYYY-MM-DD HH:mm'],
      ['P1DT', 'YYYY-MM-DD'],
      ['P1YT', 'YYYY'],
    ],
    'dateFormat:tz': 'UTC',
  };

  test('setBounds/getBounds - bounds is correct', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    const bounds = {
      min: moment('2020-03-25'),
      max: moment('2020-03-31'),
    };
    timeBuckets.setBounds(bounds);
    const timeBucketsBounds = timeBuckets.getBounds();

    expect(timeBucketsBounds).toEqual(bounds);
  });

  test('setBounds/getBounds - bounds is undefined', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    const bounds = {
      min: moment('2020-03-25'),
      max: moment('2020-03-31'),
    };
    timeBuckets.setBounds(bounds);
    let timeBucketsBounds = timeBuckets.getBounds();

    expect(timeBucketsBounds).toEqual(bounds);

    timeBuckets.setBounds();
    timeBucketsBounds = timeBuckets.getBounds();

    expect(timeBucketsBounds).toBeUndefined();
  });

  test('setInterval/getInterval - intreval is a string', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    timeBuckets.setInterval('20m');

    const interval = timeBuckets.getInterval();

    expect(interval.description).toEqual('20 minutes');
    expect(interval.esValue).toEqual(20);
    expect(interval.esUnit).toEqual('m');
    expect(interval.expression).toEqual('20m');
  });

  test('getInterval - should scale interval', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    const bounds = {
      min: moment('2020-03-25'),
      max: moment('2020-03-31'),
    };
    timeBuckets.setBounds(bounds);
    timeBuckets.setInterval('1m');

    const interval = timeBuckets.getInterval();

    expect(interval.description).toEqual('day');
    expect(interval.esValue).toEqual(1);
    expect(interval.esUnit).toEqual('d');
    expect(interval.expression).toEqual('1d');
  });

  test('setInterval/getInterval - intreval is a string and bounds is defined', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    const bounds = {
      min: moment('2020-03-25'),
      max: moment('2020-03-31'),
    };
    timeBuckets.setBounds(bounds);
    timeBuckets.setInterval('20m');
    const interval = timeBuckets.getInterval();

    expect(interval.description).toEqual('day');
    expect(interval.esValue).toEqual(1);
    expect(interval.esUnit).toEqual('d');
    expect(interval.expression).toEqual('1d');
    expect(interval.scaled).toBeTruthy();
    expect(interval.scale).toEqual(0.013888888888888888);

    if (interval.preScaled) {
      expect(interval.preScaled.description).toEqual('20 minutes');
      expect(interval.preScaled.esValue).toEqual(20);
      expect(interval.preScaled.esUnit).toEqual('m');
      expect(interval.preScaled.expression).toEqual('20m');
    }
  });

  test('setInterval/getInterval - interval is a "auto"', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    timeBuckets.setInterval(autoInterval);
    const interval = timeBuckets.getInterval();

    expect(interval.description).toEqual('0 milliseconds');
    expect(interval.esValue).toEqual(0);
    expect(interval.esUnit).toEqual('ms');
    expect(interval.expression).toEqual('0ms');
  });

  test('setInterval/getInterval - interval is a "auto" (useNormalizedEsInterval is false)', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    timeBuckets.setInterval(autoInterval);
    const interval = timeBuckets.getInterval(false);

    expect(interval.esValue).toEqual(0);
    expect(interval.esUnit).toEqual('ms');
    expect(interval.expression).toEqual('0ms');
  });

  test('getScaledDateFormat', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    timeBuckets.setInterval('20m');
    timeBuckets.getScaledDateFormat();
    const format = timeBuckets.getScaledDateFormat();
    expect(format).toEqual('HH:mm');
  });

  test('getScaledDateFormat - prepends date when range spans multiple calendar days and format is time-only', () => {
    // Use a high maxBars so a 20m interval is not scaled up past 1h.
    const config: TimeBucketsConfig = { ...timeBucketConfig, 'histogram:maxBars': 1000 };
    const timeBuckets = new TimeBuckets(config);
    // Pin moments in UTC so the test is timezone-agnostic: 23:00–01:00 UTC crosses midnight.
    timeBuckets.setBounds({
      min: moment.tz('2020-03-25T23:00:00', 'UTC'),
      max: moment.tz('2020-03-26T01:00:00', 'UTC'),
    });
    timeBuckets.setInterval('20m');
    const format = timeBuckets.getScaledDateFormat();
    // The PT1M rule selects 'HH:mm'; because the range crosses a calendar day the date is prepended.
    expect(format).toEqual('YYYY-MM-DD HH:mm');
  });

  test('getScaledDateFormat - does not prepend date when range is within same calendar day', () => {
    const config: TimeBucketsConfig = { ...timeBucketConfig, 'histogram:maxBars': 1000 };
    const timeBuckets = new TimeBuckets(config);
    // 00:00–23:00 UTC stays on the same UTC day.
    timeBuckets.setBounds({
      min: moment.tz('2020-03-25T00:00:00', 'UTC'),
      max: moment.tz('2020-03-25T23:00:00', 'UTC'),
    });
    timeBuckets.setInterval('20m');
    const format = timeBuckets.getScaledDateFormat();
    expect(format).toEqual('HH:mm');
  });

  test('getScaledDateFormat - prepends date when range crosses midnight only in the configured timezone', () => {
    // 06:30–07:30 UTC is one UTC day but spans 23:30–00:30 in America/Los_Angeles (UTC-7).
    const config: TimeBucketsConfig = {
      ...timeBucketConfig,
      'histogram:maxBars': 1000,
      'dateFormat:tz': 'America/Los_Angeles',
    };
    const timeBuckets = new TimeBuckets(config);
    timeBuckets.setBounds({
      min: moment.tz('2023-06-16T06:30:00', 'UTC'),
      max: moment.tz('2023-06-16T07:30:00', 'UTC'),
    });
    timeBuckets.setInterval('20m');
    const format = timeBuckets.getScaledDateFormat();
    expect(format).toEqual('YYYY-MM-DD HH:mm');
  });

  test('getScaledDateFormat - does not prepend date when range stays within one calendar day in the configured timezone', () => {
    // 14:00–23:00 UTC is 07:00–16:00 in America/Los_Angeles — same calendar day.
    const config: TimeBucketsConfig = {
      ...timeBucketConfig,
      'histogram:maxBars': 1000,
      'dateFormat:tz': 'America/Los_Angeles',
    };
    const timeBuckets = new TimeBuckets(config);
    timeBuckets.setBounds({
      min: moment.tz('2023-06-16T14:00:00', 'UTC'),
      max: moment.tz('2023-06-16T23:00:00', 'UTC'),
    });
    timeBuckets.setInterval('20m');
    const format = timeBuckets.getScaledDateFormat();
    expect(format).toEqual('HH:mm');
  });

  test('getScaledDateFormat - prepends date when format uses kk (1-24 hour) and range crosses midnight', () => {
    const config: TimeBucketsConfig = {
      ...timeBucketConfig,
      'histogram:maxBars': 1000,
      'dateFormat:scaled': [
        ['', 'HH:mm:ss.SSS'],
        ['PT1S', 'HH:mm:ss'],
        ['PT1M', 'kk:mm'],
        ['PT1H', 'YYYY-MM-DD HH:mm'],
        ['P1DT', 'YYYY-MM-DD'],
        ['P1YT', 'YYYY'],
      ],
    };
    const timeBuckets = new TimeBuckets(config);
    // 23:00–01:00 UTC crosses midnight.
    timeBuckets.setBounds({
      min: moment.tz('2020-03-25T23:00:00', 'UTC'),
      max: moment.tz('2020-03-26T01:00:00', 'UTC'),
    });
    timeBuckets.setInterval('20m');
    const format = timeBuckets.getScaledDateFormat();
    expect(format).toEqual('YYYY-MM-DD kk:mm');
  });

  test('allows days but throws error on weeks', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    timeBuckets.setInterval('14d');
    const interval = timeBuckets.getInterval(false);
    expect(interval.esUnit).toEqual('d');

    timeBuckets.setInterval('2w');
    expect(() => timeBuckets.getInterval(false)).toThrow(InvalidEsCalendarIntervalError);
  });
});
