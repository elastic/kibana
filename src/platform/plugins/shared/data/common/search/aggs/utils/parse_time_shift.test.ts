/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import {
  isAbsoluteTimeShift,
  parseAbsoluteTimeShift,
  parseTimeShift,
  REASON_IDS,
  validateAbsoluteTimeShift,
} from './parse_time_shift';

describe('parse time shifts', () => {
  describe('relative time shifts', () => {
    it('should return valid duration for valid units', () => {
      for (const unit of ['s', 'm', 'h', 'd', 'w', 'M', 'y']) {
        expect(moment.isDuration(parseTimeShift(`1${unit}`))).toBeTruthy();
      }
    });

    it('should return previous for the previous string', () => {
      expect(parseTimeShift('previous')).toBe('previous');
    });

    it('should return "invalid" for anything else', () => {
      for (const value of ['1a', 's', 'non-valid-string']) {
        expect(parseTimeShift(value)).toBe('invalid');
      }
    });
  });

  describe('absolute time shifts', () => {
    const dateString = '2022-11-02T00:00:00.000Z';
    const futureDateString = '3022-11-02T00:00:00.000Z';

    function applyTimeZone(zone: string = 'Z') {
      return dateString.replace('Z', zone);
    }
    describe('isAbsoluteTimeShift', () => {
      it('should return true for a valid absoluteTimeShift string', () => {
        for (const anchor of ['startAt', 'endAt']) {
          expect(isAbsoluteTimeShift(`${anchor}(${dateString})`)).toBeTruthy();
        }
      });

      it('should return false for no string passed', () => {
        expect(isAbsoluteTimeShift()).toBeFalsy();
      });

      // that's ok, the function is used to distinguish from the relative shifts
      it('should perform only a shallow check on the string', () => {
        expect(isAbsoluteTimeShift('startAt(aaaaa)')).toBeTruthy();
      });
    });

    describe('validateAbsoluteTimeShift', () => {
      it('should return no error for valid time shifts', () => {
        for (const anchor of ['startAt', 'endAt']) {
          expect(
            validateAbsoluteTimeShift(`${anchor}(${dateString})`, {
              from: moment(dateString).add('5', 'd').toISOString(),
              to: moment(dateString).add('6', 'd').toISOString(),
            })
          ).toBeUndefined();
        }
      });

      it('should return no error for valid time shifts if no time range is passed', () => {
        for (const anchor of ['startAt', 'endAt']) {
          expect(validateAbsoluteTimeShift(`${anchor}(${dateString})`)).toBeUndefined();
          // This will pass as the range checks are relaxed without the second argument passed
          expect(validateAbsoluteTimeShift(`${anchor}(${futureDateString})`)).toBeUndefined();
        }
      });

      it('should return an error if the string value is not an absolute time shift', () => {
        for (const val of ['startAt()', 'endAt()', '1d', 'aaa']) {
          expect(validateAbsoluteTimeShift(val)).toBe(REASON_IDS.notAbsoluteTimeShift);
        }
      });

      it('should return an error if the passed date is invalid', () => {
        for (const val of [
          'startAt(a)',
          'endAt(a)',
          'startAt(2022)',
          'startAt(2022-11-02T00:00:00.000)',
          'endAt(2022-11-02)',
        ]) {
          expect(validateAbsoluteTimeShift(val)).toBe(REASON_IDS.invalidDate);
        }
      });

      it('should return an error if dateRange is passed and the shift is after that', () => {
        for (const anchor of ['startAt', 'endAt']) {
          expect(
            validateAbsoluteTimeShift(`${anchor}(${futureDateString})`, {
              from: moment(dateString).subtract('1', 'd').toISOString(),
              to: moment(dateString).add('1', 'd').toISOString(),
            })
          ).toBe(REASON_IDS.shiftAfterTimeRange);
        }
      });

      it('should return no error for dates with non-UTC offset', () => {
        for (const anchor of ['startAt', 'endAt']) {
          for (const offset of ['Z', '+01:00', '-12:00', '-05']) {
            expect(
              validateAbsoluteTimeShift(`${anchor}(${applyTimeZone(offset)})`, {
                from: moment(dateString).add('5', 'd').toISOString(),
                to: moment(dateString).add('6', 'd').toISOString(),
              })
            ).toBeUndefined();
          }
        }
      });

      it('should validate against absolute time range values', () => {
        expect(
          validateAbsoluteTimeShift(`startAt(${futureDateString})`, {
            from: 'now-1y',
            to: 'now',
          })
        ).toBe(REASON_IDS.shiftAfterTimeRange);
      });
    });

    describe('parseAbsoluteTimeShift', () => {
      it('should return an error if no time range is passed', () => {
        for (const anchor of ['startAt', 'endAt']) {
          expect(parseAbsoluteTimeShift(`${anchor}(${dateString})`, undefined)).toEqual({
            value: 'invalid',
            reason: REASON_IDS.missingTimerange,
          });
        }
      });

      it('should return an error for invalid dates', () => {
        for (const invalidDates of [
          'startAt(a)',
          'endAt(a)',
          'startAt(2022)',
          'startAt(2022-11-02T00:00:00.000)',
          'endAt(2022-11-02)',
          '1d',
          'aaa',
          `startAt(${futureDateString})`,
        ]) {
          expect(
            parseAbsoluteTimeShift(invalidDates, {
              from: moment(dateString).add('5', 'd').toISOString(),
              to: moment(dateString).add('6', 'd').toISOString(),
            }).value
          ).toBe('invalid');
        }
      });

      it('should return no reason for a valid absolute time shift', () => {
        for (const anchor of ['startAt', 'endAt']) {
          expect(
            parseAbsoluteTimeShift(`${anchor}(${dateString})`, {
              from: moment(dateString).add('5', 'd').toISOString(),
              to: moment(dateString).add('6', 'd').toISOString(),
            }).reason
          ).toBe(null);
        }
      });
    });
  });
});
