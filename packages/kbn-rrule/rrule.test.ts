/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import sinon from 'sinon';
import moment from 'moment-timezone';
import { RRule, Frequency, Weekday } from './rrule';

const DATE_2019 = '2019-01-01T00:00:00.000Z';
const DATE_2020 = '2020-01-01T00:00:00.000Z';
const DATE_2020_MINUS_1_MONTH = '2019-12-01T00:00:00.000Z';

const NOW = DATE_2020;

let fakeTimer: sinon.SinonFakeTimers;

describe('RRule', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers(new Date(NOW));
  });

  afterAll(() => fakeTimer.restore());

  describe('frequency', () => {
    it('works with yearly', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.YEARLY,
        interval: 1,
        tzid: 'UTC',
      });

      expect(rule.all(10).map((d) => d.getUTCFullYear())).toEqual(
        expect.arrayContaining([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028])
      );

      const rule2 = new RRule({
        dtstart: new Date(DATE_2020),
        freq: Frequency.YEARLY,
        interval: 3,
        tzid: 'UTC',
      });

      expect(rule2.all(10).map((d) => d.getUTCFullYear())).toEqual(
        expect.arrayContaining([2020, 2023, 2026, 2029, 2032, 2035, 2038, 2041, 2044, 2047])
      );
    });

    it('works with monthly', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MONTHLY,
        interval: 1,
        tzid: 'UTC',
      });

      expect(rule.all(15).map((d) => d.getUTCMonth())).toEqual(
        expect.arrayContaining([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2])
      );

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MONTHLY,
        interval: 6,
        tzid: 'UTC',
      });

      expect(rule2.all(6).map((d) => d.getUTCMonth())).toEqual(
        expect.arrayContaining([0, 6, 0, 6, 0, 6])
      );
    });

    it('works with weekly', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.WEEKLY,
        interval: 1,
        tzid: 'UTC',
      });

      const result = rule.all(52).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(7, 'd').dayOfYear() === moment(arr[i - 1]).dayOfYear();
      });
      expect(result.every(Boolean)).toBeTruthy();

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.WEEKLY,
        interval: 2,
        tzid: 'UTC',
      });

      const result2 = rule2.all(52).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(14, 'd').dayOfYear() === moment(arr[i - 1]).dayOfYear();
      });
      expect(result2.every(Boolean)).toBeTruthy();
    });

    it('works with daily', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.DAILY,
        interval: 1,
        tzid: 'UTC',
      });

      const result = rule.all(400).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(1, 'd').dayOfYear() === moment(arr[i - 1]).dayOfYear();
      });
      expect(result.every(Boolean)).toBeTruthy();

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.DAILY,
        interval: 48,
        tzid: 'UTC',
      });

      const result2 = rule2.all(400).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(48, 'd').dayOfYear() === moment(arr[i - 1]).dayOfYear();
      });
      expect(result2.every(Boolean)).toBeTruthy();
    });

    it('works with hourly', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.HOURLY,
        interval: 1,
        tzid: 'UTC',
      });

      const result = rule.all(72).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(1, 'h').hour() === moment(arr[i - 1]).hour();
      });
      expect(result.every(Boolean)).toBeTruthy();

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.HOURLY,
        interval: 36,
        tzid: 'UTC',
      });

      const result2 = rule2.all(72).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(36, 'h').hour() === moment(arr[i - 1]).hour();
      });
      expect(result2.every(Boolean)).toBeTruthy();
    });

    it('works with minutely', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MINUTELY,
        interval: 15,
        tzid: 'UTC',
      });

      const result = rule.all(72).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(15, 'm').minute() === moment(arr[i - 1]).minute();
      });
      expect(result.every(Boolean)).toBeTruthy();

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MINUTELY,
        interval: 36,
        tzid: 'UTC',
      });

      const result2 = rule2.all(72).map((date, i, arr) => {
        if (i === 0) return true;
        return moment(date).subtract(36, 'm').minute() === moment(arr[i - 1]).minute();
      });
      expect(result2.every(Boolean)).toBeTruthy();
    });
  });

  it('works with until', () => {
    const rule = new RRule({
      dtstart: new Date(DATE_2019),
      freq: Frequency.MONTHLY,
      interval: 1,
      tzid: 'UTC',
      until: new Date(DATE_2020_MINUS_1_MONTH),
    });
    expect(rule.all().length).toBe(12);
  });

  it('works with count', () => {
    const rule = new RRule({
      dtstart: new Date(DATE_2019),
      freq: Frequency.MONTHLY,
      interval: 1,
      tzid: 'UTC',
      count: 20,
    });
    expect(rule.all().map((d) => d.getUTCMonth())).toEqual(
      expect.arrayContaining([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7])
    );
  });

  describe('byweekday', () => {
    it('works with weekly frequency', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.WEEKLY,
        interval: 1,
        tzid: 'UTC',
        byweekday: [Weekday.TH],
      });
      const result = rule.all(52);

      expect(moment(result[0]).tz('UTC').isoWeekday()).toEqual(Weekday.TU); // Jan 1 2019 is a Tuesday
      expect(
        result.slice(1).every((d) => moment(d).tz('UTC').isoWeekday() === Weekday.TH)
      ).toBeTruthy();

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.WEEKLY,
        interval: 1,
        tzid: 'UTC',
        byweekday: [Weekday.SA, Weekday.SU, Weekday.MO],
      });

      expect(rule2.all(9).map((d) => moment(d).tz('UTC').isoWeekday())).toEqual(
        expect.arrayContaining([
          Weekday.MO,
          Weekday.SA,
          Weekday.SU,
          Weekday.MO,
          Weekday.SA,
          Weekday.SU,
          Weekday.MO,
          Weekday.SA,
          Weekday.SU,
        ])
      );
    });

    it('works with monthly frequency using setpos syntax', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MONTHLY,
        interval: 1,
        tzid: 'UTC',
        byweekday: ['+1TU'],
      });
      const result = rule.all(12);

      expect(result.map((d) => d.toISOString())).toEqual(
        expect.arrayContaining([
          '2019-01-01T00:00:00.000Z',
          '2019-02-05T00:00:00.000Z',
          '2019-03-05T00:00:00.000Z',
          '2019-04-02T00:00:00.000Z',
          '2019-05-07T00:00:00.000Z',
          '2019-06-04T00:00:00.000Z',
          '2019-07-02T00:00:00.000Z',
          '2019-08-06T00:00:00.000Z',
          '2019-09-03T00:00:00.000Z',
          '2019-10-01T00:00:00.000Z',
          '2019-11-05T00:00:00.000Z',
          '2019-12-03T00:00:00.000Z',
        ])
      );
    });
  });
});
