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

import { TimeBuckets, TimeBucketsConfig } from './time_buckets';

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
    timeBuckets.setInterval('auto');
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
