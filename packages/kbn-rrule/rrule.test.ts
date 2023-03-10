/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import sinon from 'sinon';
import { RRule, Frequency, Weekday } from './rrule';

const DATE_2019 = '2019-01-01T00:00:00.000Z';
const DATE_2019_DECEMBER_19 = '2019-12-19T00:00:00.000Z';
const DATE_2020 = '2020-01-01T00:00:00.000Z';
const DATE_2020_MINUS_1_MONTH = '2019-12-01T00:00:00.000Z';
const DATE_2023 = '2023-01-01T00:00:00.000Z';

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

      expect(rule.all(10)).toMatchInlineSnapshot(`
        Array [
          2019-01-01T00:00:00.000Z,
          2020-01-01T00:00:00.000Z,
          2021-01-01T00:00:00.000Z,
          2022-01-01T00:00:00.000Z,
          2023-01-01T00:00:00.000Z,
          2024-01-01T00:00:00.000Z,
          2025-01-01T00:00:00.000Z,
          2026-01-01T00:00:00.000Z,
          2027-01-01T00:00:00.000Z,
          2028-01-01T00:00:00.000Z,
        ]
      `);

      const rule2 = new RRule({
        dtstart: new Date(DATE_2020),
        freq: Frequency.YEARLY,
        interval: 3,
        tzid: 'UTC',
      });

      expect(rule2.all(10)).toMatchInlineSnapshot(`
        Array [
          2020-01-01T00:00:00.000Z,
          2023-01-01T00:00:00.000Z,
          2026-01-01T00:00:00.000Z,
          2029-01-01T00:00:00.000Z,
          2032-01-01T00:00:00.000Z,
          2035-01-01T00:00:00.000Z,
          2038-01-01T00:00:00.000Z,
          2041-01-01T00:00:00.000Z,
          2044-01-01T00:00:00.000Z,
          2047-01-01T00:00:00.000Z,
        ]
      `);
    });

    it('works with monthly', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MONTHLY,
        interval: 1,
        tzid: 'UTC',
      });

      expect(rule.all(15)).toMatchInlineSnapshot(`
        Array [
          2019-01-01T00:00:00.000Z,
          2019-02-01T00:00:00.000Z,
          2019-03-01T00:00:00.000Z,
          2019-04-01T00:00:00.000Z,
          2019-05-01T00:00:00.000Z,
          2019-06-01T00:00:00.000Z,
          2019-07-01T00:00:00.000Z,
          2019-08-01T00:00:00.000Z,
          2019-09-01T00:00:00.000Z,
          2019-10-01T00:00:00.000Z,
          2019-11-01T00:00:00.000Z,
          2019-12-01T00:00:00.000Z,
          2020-01-01T00:00:00.000Z,
          2020-02-01T00:00:00.000Z,
          2020-03-01T00:00:00.000Z,
        ]
      `);

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MONTHLY,
        interval: 6,
        tzid: 'UTC',
      });

      expect(rule2.all(6)).toMatchInlineSnapshot(`
        Array [
          2019-01-01T00:00:00.000Z,
          2019-07-01T00:00:00.000Z,
          2020-01-01T00:00:00.000Z,
          2020-07-01T00:00:00.000Z,
          2021-01-01T00:00:00.000Z,
          2021-07-01T00:00:00.000Z,
        ]
      `);
    });

    it('works with weekly', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019_DECEMBER_19),
        freq: Frequency.WEEKLY,
        interval: 1,
        tzid: 'UTC',
      });

      expect(rule.all(14)).toMatchInlineSnapshot(`
        Array [
          2019-12-19T00:00:00.000Z,
          2019-12-26T00:00:00.000Z,
          2020-01-02T00:00:00.000Z,
          2020-01-09T00:00:00.000Z,
          2020-01-16T00:00:00.000Z,
          2020-01-23T00:00:00.000Z,
          2020-01-30T00:00:00.000Z,
          2020-02-06T00:00:00.000Z,
          2020-02-13T00:00:00.000Z,
          2020-02-20T00:00:00.000Z,
          2020-02-27T00:00:00.000Z,
          2020-03-05T00:00:00.000Z,
          2020-03-12T00:00:00.000Z,
          2020-03-19T00:00:00.000Z,
        ]
      `);

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019_DECEMBER_19),
        freq: Frequency.WEEKLY,
        interval: 2,
        tzid: 'UTC',
      });

      expect(rule2.all(14)).toMatchInlineSnapshot(`
        Array [
          2019-12-19T00:00:00.000Z,
          2020-01-02T00:00:00.000Z,
          2020-01-16T00:00:00.000Z,
          2020-01-30T00:00:00.000Z,
          2020-02-13T00:00:00.000Z,
          2020-02-27T00:00:00.000Z,
          2020-03-12T00:00:00.000Z,
          2020-03-26T00:00:00.000Z,
          2020-04-09T00:00:00.000Z,
          2020-04-23T00:00:00.000Z,
          2020-05-07T00:00:00.000Z,
          2020-05-21T00:00:00.000Z,
          2020-06-04T00:00:00.000Z,
          2020-06-18T00:00:00.000Z,
        ]
      `);
    });

    it('works with daily', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019_DECEMBER_19),
        freq: Frequency.DAILY,
        interval: 1,
        tzid: 'UTC',
      });

      expect(rule.all(30)).toMatchInlineSnapshot(`
        Array [
          2019-12-19T00:00:00.000Z,
          2019-12-20T00:00:00.000Z,
          2019-12-21T00:00:00.000Z,
          2019-12-22T00:00:00.000Z,
          2019-12-23T00:00:00.000Z,
          2019-12-24T00:00:00.000Z,
          2019-12-25T00:00:00.000Z,
          2019-12-26T00:00:00.000Z,
          2019-12-27T00:00:00.000Z,
          2019-12-28T00:00:00.000Z,
          2019-12-29T00:00:00.000Z,
          2019-12-30T00:00:00.000Z,
          2019-12-31T00:00:00.000Z,
          2020-01-01T00:00:00.000Z,
          2020-01-02T00:00:00.000Z,
          2020-01-03T00:00:00.000Z,
          2020-01-04T00:00:00.000Z,
          2020-01-05T00:00:00.000Z,
          2020-01-06T00:00:00.000Z,
          2020-01-07T00:00:00.000Z,
          2020-01-08T00:00:00.000Z,
          2020-01-09T00:00:00.000Z,
          2020-01-10T00:00:00.000Z,
          2020-01-11T00:00:00.000Z,
          2020-01-12T00:00:00.000Z,
          2020-01-13T00:00:00.000Z,
          2020-01-14T00:00:00.000Z,
          2020-01-15T00:00:00.000Z,
          2020-01-16T00:00:00.000Z,
          2020-01-17T00:00:00.000Z,
        ]
      `);

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019_DECEMBER_19),
        freq: Frequency.DAILY,
        interval: 48,
        tzid: 'UTC',
      });

      expect(rule2.all(12)).toMatchInlineSnapshot(`
        Array [
          2019-12-19T00:00:00.000Z,
          2020-02-05T00:00:00.000Z,
          2020-03-24T00:00:00.000Z,
          2020-05-11T00:00:00.000Z,
          2020-06-28T00:00:00.000Z,
          2020-08-15T00:00:00.000Z,
          2020-10-02T00:00:00.000Z,
          2020-11-19T00:00:00.000Z,
          2021-01-06T00:00:00.000Z,
          2021-02-23T00:00:00.000Z,
          2021-04-12T00:00:00.000Z,
          2021-05-30T00:00:00.000Z,
        ]
      `);
    });

    it('works with hourly', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.HOURLY,
        interval: 1,
        tzid: 'UTC',
      });

      expect(rule.all(30)).toMatchInlineSnapshot(`
        Array [
          2019-01-01T00:00:00.000Z,
          2019-01-01T01:00:00.000Z,
          2019-01-01T02:00:00.000Z,
          2019-01-01T03:00:00.000Z,
          2019-01-01T04:00:00.000Z,
          2019-01-01T05:00:00.000Z,
          2019-01-01T06:00:00.000Z,
          2019-01-01T07:00:00.000Z,
          2019-01-01T08:00:00.000Z,
          2019-01-01T09:00:00.000Z,
          2019-01-01T10:00:00.000Z,
          2019-01-01T11:00:00.000Z,
          2019-01-01T12:00:00.000Z,
          2019-01-01T13:00:00.000Z,
          2019-01-01T14:00:00.000Z,
          2019-01-01T15:00:00.000Z,
          2019-01-01T16:00:00.000Z,
          2019-01-01T17:00:00.000Z,
          2019-01-01T18:00:00.000Z,
          2019-01-01T19:00:00.000Z,
          2019-01-01T20:00:00.000Z,
          2019-01-01T21:00:00.000Z,
          2019-01-01T22:00:00.000Z,
          2019-01-01T23:00:00.000Z,
          2019-01-02T00:00:00.000Z,
          2019-01-02T01:00:00.000Z,
          2019-01-02T02:00:00.000Z,
          2019-01-02T03:00:00.000Z,
          2019-01-02T04:00:00.000Z,
          2019-01-02T05:00:00.000Z,
        ]
      `);

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.HOURLY,
        interval: 36,
        tzid: 'UTC',
      });

      expect(rule2.all(30)).toMatchInlineSnapshot(`
        Array [
          2019-01-01T00:00:00.000Z,
          2019-01-02T12:00:00.000Z,
          2019-01-04T00:00:00.000Z,
          2019-01-05T12:00:00.000Z,
          2019-01-07T00:00:00.000Z,
          2019-01-08T12:00:00.000Z,
          2019-01-10T00:00:00.000Z,
          2019-01-11T12:00:00.000Z,
          2019-01-13T00:00:00.000Z,
          2019-01-14T12:00:00.000Z,
          2019-01-16T00:00:00.000Z,
          2019-01-17T12:00:00.000Z,
          2019-01-19T00:00:00.000Z,
          2019-01-20T12:00:00.000Z,
          2019-01-22T00:00:00.000Z,
          2019-01-23T12:00:00.000Z,
          2019-01-25T00:00:00.000Z,
          2019-01-26T12:00:00.000Z,
          2019-01-28T00:00:00.000Z,
          2019-01-29T12:00:00.000Z,
          2019-01-31T00:00:00.000Z,
          2019-02-01T12:00:00.000Z,
          2019-02-03T00:00:00.000Z,
          2019-02-04T12:00:00.000Z,
          2019-02-06T00:00:00.000Z,
          2019-02-07T12:00:00.000Z,
          2019-02-09T00:00:00.000Z,
          2019-02-10T12:00:00.000Z,
          2019-02-12T00:00:00.000Z,
          2019-02-13T12:00:00.000Z,
        ]
      `);
    });

    it('works with minutely', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MINUTELY,
        interval: 15,
        tzid: 'UTC',
      });

      expect(rule.all(10)).toMatchInlineSnapshot(`
        Array [
          2019-01-01T00:00:00.000Z,
          2019-01-01T00:15:00.000Z,
          2019-01-01T00:30:00.000Z,
          2019-01-01T00:45:00.000Z,
          2019-01-01T01:00:00.000Z,
          2019-01-01T01:15:00.000Z,
          2019-01-01T01:30:00.000Z,
          2019-01-01T01:45:00.000Z,
          2019-01-01T02:00:00.000Z,
          2019-01-01T02:15:00.000Z,
        ]
      `);

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.MINUTELY,
        interval: 36,
        tzid: 'UTC',
      });

      expect(rule2.all(30)).toMatchInlineSnapshot(`
        Array [
          2019-01-01T00:00:00.000Z,
          2019-01-01T00:36:00.000Z,
          2019-01-01T01:12:00.000Z,
          2019-01-01T01:48:00.000Z,
          2019-01-01T02:24:00.000Z,
          2019-01-01T03:00:00.000Z,
          2019-01-01T03:36:00.000Z,
          2019-01-01T04:12:00.000Z,
          2019-01-01T04:48:00.000Z,
          2019-01-01T05:24:00.000Z,
          2019-01-01T06:00:00.000Z,
          2019-01-01T06:36:00.000Z,
          2019-01-01T07:12:00.000Z,
          2019-01-01T07:48:00.000Z,
          2019-01-01T08:24:00.000Z,
          2019-01-01T09:00:00.000Z,
          2019-01-01T09:36:00.000Z,
          2019-01-01T10:12:00.000Z,
          2019-01-01T10:48:00.000Z,
          2019-01-01T11:24:00.000Z,
          2019-01-01T12:00:00.000Z,
          2019-01-01T12:36:00.000Z,
          2019-01-01T13:12:00.000Z,
          2019-01-01T13:48:00.000Z,
          2019-01-01T14:24:00.000Z,
          2019-01-01T15:00:00.000Z,
          2019-01-01T15:36:00.000Z,
          2019-01-01T16:12:00.000Z,
          2019-01-01T16:48:00.000Z,
          2019-01-01T17:24:00.000Z,
        ]
      `);
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
    expect(rule.all()).toMatchInlineSnapshot(`
      Array [
        2019-01-01T00:00:00.000Z,
        2019-02-01T00:00:00.000Z,
        2019-03-01T00:00:00.000Z,
        2019-04-01T00:00:00.000Z,
        2019-05-01T00:00:00.000Z,
        2019-06-01T00:00:00.000Z,
        2019-07-01T00:00:00.000Z,
        2019-08-01T00:00:00.000Z,
        2019-09-01T00:00:00.000Z,
        2019-10-01T00:00:00.000Z,
        2019-11-01T00:00:00.000Z,
        2019-12-01T00:00:00.000Z,
        2020-01-01T00:00:00.000Z,
        2020-02-01T00:00:00.000Z,
        2020-03-01T00:00:00.000Z,
        2020-04-01T00:00:00.000Z,
        2020-05-01T00:00:00.000Z,
        2020-06-01T00:00:00.000Z,
        2020-07-01T00:00:00.000Z,
        2020-08-01T00:00:00.000Z,
      ]
    `);
  });

  describe('byweekday', () => {
    it('works with weekly frequency', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2019_DECEMBER_19),
        freq: Frequency.WEEKLY,
        interval: 1,
        tzid: 'UTC',
        byweekday: [Weekday.TH],
      });
      expect(rule.all(14)).toMatchInlineSnapshot(`
        Array [
          2019-12-19T00:00:00.000Z,
          2019-12-26T00:00:00.000Z,
          2020-01-02T00:00:00.000Z,
          2020-01-09T00:00:00.000Z,
          2020-01-16T00:00:00.000Z,
          2020-01-23T00:00:00.000Z,
          2020-01-30T00:00:00.000Z,
          2020-02-06T00:00:00.000Z,
          2020-02-13T00:00:00.000Z,
          2020-02-20T00:00:00.000Z,
          2020-02-27T00:00:00.000Z,
          2020-03-05T00:00:00.000Z,
          2020-03-12T00:00:00.000Z,
          2020-03-19T00:00:00.000Z,
        ]
      `);

      const rule2 = new RRule({
        dtstart: new Date(DATE_2019),
        freq: Frequency.WEEKLY,
        interval: 1,
        tzid: 'UTC',
        byweekday: [Weekday.SA, Weekday.SU, Weekday.MO],
      });

      expect(rule2.all(9)).toMatchInlineSnapshot(`
        Array [
          2018-12-31T00:00:00.000Z,
          2019-01-05T00:00:00.000Z,
          2019-01-06T00:00:00.000Z,
          2019-01-07T00:00:00.000Z,
          2019-01-12T00:00:00.000Z,
          2019-01-13T00:00:00.000Z,
          2019-01-14T00:00:00.000Z,
          2019-01-19T00:00:00.000Z,
          2019-01-20T00:00:00.000Z,
        ]
      `);
    });

    it('works with monthly frequency using setpos syntax', () => {
      const rule = new RRule({
        dtstart: new Date(DATE_2023),
        freq: Frequency.MONTHLY,
        interval: 1,
        tzid: 'UTC',
        byweekday: ['+1TU', '+2TU', '-1FR', '-2FR'],
      });
      const result = rule.all(12);

      expect(result).toMatchInlineSnapshot(`
        Array [
          2023-01-10T00:00:00.000Z,
          2023-01-17T00:00:00.000Z,
          2023-01-20T00:00:00.000Z,
          2023-01-27T00:00:00.000Z,
          2023-02-14T00:00:00.000Z,
          2023-02-21T00:00:00.000Z,
          2023-02-17T00:00:00.000Z,
          2023-02-24T00:00:00.000Z,
          2023-03-14T00:00:00.000Z,
          2023-03-21T00:00:00.000Z,
          2023-03-24T00:00:00.000Z,
          2023-03-31T00:00:00.000Z,
        ]
      `);
    });
  });
});
