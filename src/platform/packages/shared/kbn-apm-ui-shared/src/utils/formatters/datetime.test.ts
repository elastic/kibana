/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { asAbsoluteDateTime, getDateDifference } from './datetime';

describe('date time formatters', () => {
  beforeAll(() => {
    moment.tz.setDefault('Europe/Amsterdam');
  });
  afterAll(() => moment.tz.setDefault(''));

  describe('asAbsoluteDateTime', () => {
    afterAll(() => moment.tz.setDefault(''));

    it('should add a leading plus for timezones with positive UTC offset', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe('Jun 1, 2019 @ 14:00 (UTC+2)');
    });

    it('should add a leading minus for timezones with negative UTC offset', () => {
      moment.tz.setDefault('America/Los_Angeles');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe('Jun 1, 2019 @ 05:00 (UTC-7)');
    });

    it('should use default UTC offset formatting when offset contains minutes', () => {
      moment.tz.setDefault('Canada/Newfoundland');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe('Jun 1, 2019 @ 09:30 (UTC-02:30)');
    });

    it('should respect DST', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      const timeWithDST = 1559390400000; //  Jun 1, 2019
      const timeWithoutDST = 1575201600000; //  Dec 1, 2019

      expect(asAbsoluteDateTime(timeWithDST)).toBe('Jun 1, 2019 @ 14:00:00.000 (UTC+2)');

      expect(asAbsoluteDateTime(timeWithoutDST)).toBe('Dec 1, 2019 @ 13:00:00.000 (UTC+1)');
    });

    it('milliseconds', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(asAbsoluteDateTime(1559390400000, 'milliseconds')).toBe(
        'Jun 1, 2019 @ 14:00:00.000 (UTC+2)'
      );
    });

    it('seconds', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(asAbsoluteDateTime(1559390400000, 'seconds')).toBe('Jun 1, 2019 @ 14:00:00 (UTC+2)');
    });

    it('minutes', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe('Jun 1, 2019 @ 14:00 (UTC+2)');
    });

    it('hours', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(asAbsoluteDateTime(1559390400000, 'hours')).toBe('Jun 1, 2019 @ 14 (UTC+2)');
    });
  });
  describe('getDateDifference', () => {
    it('milliseconds', () => {
      const start = moment('2019-10-29 08:00:00.001');
      const end = moment('2019-10-29 08:00:00.005');
      expect(getDateDifference({ start, end, unitOfTime: 'milliseconds' })).toEqual(4);
    });
    it('seconds', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-29 08:00:10');
      expect(getDateDifference({ start, end, unitOfTime: 'seconds' })).toEqual(10);
    });
    it('minutes', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-29 08:15:00');
      expect(getDateDifference({ start, end, unitOfTime: 'minutes' })).toEqual(15);
    });
    it('hours', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-29 10:00:00');
      expect(getDateDifference({ start, end, unitOfTime: 'hours' })).toEqual(2);
    });
    it('days', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-30 10:00:00');
      expect(getDateDifference({ start, end, unitOfTime: 'days' })).toEqual(1);
    });
    it('months', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-12-29 08:00:00');
      expect(getDateDifference({ start, end, unitOfTime: 'months' })).toEqual(2);
    });
    it('years', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2020-10-29 08:00:00');
      expect(getDateDifference({ start, end, unitOfTime: 'years' })).toEqual(1);
    });
    it('precise days', () => {
      const start = moment('2019-10-29 08:00:00');
      const end = moment('2019-10-30 10:00:00');
      expect(getDateDifference({ start, end, unitOfTime: 'days', precise: true })).toEqual(
        1.0833333333333333
      );
    });
  });
});
