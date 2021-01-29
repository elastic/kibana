/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';

import { TimeBuckets, TimeBucketsConfig } from './time_buckets';
import { autoInterval } from '../../_interval_options';

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

  test('setInterval/getInterval - intreval is a "auto"', () => {
    const timeBuckets = new TimeBuckets(timeBucketConfig);
    timeBuckets.setInterval(autoInterval);
    const interval = timeBuckets.getInterval();

    expect(interval.description).toEqual('0 milliseconds');
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
});
