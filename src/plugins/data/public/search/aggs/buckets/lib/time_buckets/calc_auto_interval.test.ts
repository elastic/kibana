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

import { calcAutoIntervalLessThan, calcAutoIntervalNear } from './calc_auto_interval';

describe('calcAutoIntervalNear', () => {
  test('1h/0 buckets = 0ms buckets', () => {
    const interval = calcAutoIntervalNear(0, Number(moment.duration(1, 'h')));
    expect(interval.asMilliseconds()).toBe(0);
  });

  test('undefined/100 buckets = 0ms buckets', () => {
    const interval = calcAutoIntervalNear(0, undefined as any);
    expect(interval.asMilliseconds()).toBe(0);
  });

  test('1ms/100 buckets = 1ms buckets', () => {
    const interval = calcAutoIntervalNear(100, Number(moment.duration(1, 'ms')));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('200ms/100 buckets = 2ms buckets', () => {
    const interval = calcAutoIntervalNear(100, Number(moment.duration(200, 'ms')));
    expect(interval.asMilliseconds()).toBe(2);
  });

  test('1s/1000 buckets = 1ms buckets', () => {
    const interval = calcAutoIntervalNear(1000, Number(moment.duration(1, 's')));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('1000h/1000 buckets = 1h buckets', () => {
    const interval = calcAutoIntervalNear(1000, Number(moment.duration(1000, 'hours')));
    expect(interval.asHours()).toBe(1);
  });

  test('1h/100 buckets = 30s buckets', () => {
    const interval = calcAutoIntervalNear(100, Number(moment.duration(1, 'hours')));
    expect(interval.asSeconds()).toBe(30);
  });

  test('1d/25 buckets = 1h buckets', () => {
    const interval = calcAutoIntervalNear(25, Number(moment.duration(1, 'day')));
    expect(interval.asHours()).toBe(1);
  });

  test('1y/1000 buckets = 12h buckets', () => {
    const interval = calcAutoIntervalNear(1000, Number(moment.duration(1, 'year')));
    expect(interval.asHours()).toBe(12);
  });

  test('1y/10000 buckets = 1h buckets', () => {
    const interval = calcAutoIntervalNear(10000, Number(moment.duration(1, 'year')));
    expect(interval.asHours()).toBe(1);
  });

  test('1y/100000 buckets = 5m buckets', () => {
    const interval = calcAutoIntervalNear(100000, Number(moment.duration(1, 'year')));
    expect(interval.asMinutes()).toBe(5);
  });
});

describe('calcAutoIntervalLessThan', () => {
  test('1h/0 buckets = 0ms buckets', () => {
    const interval = calcAutoIntervalLessThan(0, Number(moment.duration(1, 'h')));
    expect(interval.asMilliseconds()).toBe(0);
  });

  test('undefined/100 buckets = 0ms buckets', () => {
    const interval = calcAutoIntervalLessThan(0, undefined as any);
    expect(interval.asMilliseconds()).toBe(0);
  });

  test('1ms/100 buckets = 1ms buckets', () => {
    const interval = calcAutoIntervalLessThan(100, Number(moment.duration(1, 'ms')));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('200ms/100 buckets = 2ms buckets', () => {
    const interval = calcAutoIntervalLessThan(100, Number(moment.duration(200, 'ms')));
    expect(interval.asMilliseconds()).toBe(2);
  });

  test('1s/1000 buckets = 1ms buckets', () => {
    const interval = calcAutoIntervalLessThan(1000, Number(moment.duration(1, 's')));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('1000h/1000 buckets = 1h buckets', () => {
    const interval = calcAutoIntervalLessThan(1000, Number(moment.duration(1000, 'hours')));
    expect(interval.asHours()).toBe(1);
  });

  test('1h/100 buckets = 30s buckets', () => {
    const interval = calcAutoIntervalLessThan(100, Number(moment.duration(1, 'hours')));
    expect(interval.asSeconds()).toBe(30);
  });

  test('1d/25 buckets = 30m buckets', () => {
    const interval = calcAutoIntervalLessThan(25, Number(moment.duration(1, 'day')));
    expect(interval.asMinutes()).toBe(30);
  });

  test('1y/1000 buckets = 3h buckets', () => {
    const interval = calcAutoIntervalLessThan(1000, Number(moment.duration(1, 'year')));
    expect(interval.asHours()).toBe(3);
  });

  test('1y/10000 buckets = 30m buckets', () => {
    const interval = calcAutoIntervalLessThan(10000, Number(moment.duration(1, 'year')));
    expect(interval.asMinutes()).toBe(30);
  });

  test('1y/100000 buckets = 5m buckets', () => {
    const interval = calcAutoIntervalLessThan(100000, Number(moment.duration(1, 'year')));
    expect(interval.asMinutes()).toBe(5);
  });
});
