/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { left } from 'fp-ts/lib/Either';
import { TimeDuration } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('TimeDuration', () => {
  describe('with allowedDurations', () => {
    test('it should validate a correctly formed TimeDuration with an allowed duration of 1s', () => {
      const payload = '1s';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 's'],
          [2, 'h'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a correctly formed TimeDuration with an allowed duration of 7d', () => {
      const payload = '1s';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 's'],
          [2, 'h'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate a time duration if the allowed durations does not include it', () => {
      const payload = '24h';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 's'],
          [2, 'h'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "24h" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a an allowed duration with a negative number', () => {
      const payload = '10s';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 's'],
          [-7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "[[1,"s"],[-7,"d"]]" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an allowed duration with a fractional number', () => {
      const payload = '1.5s';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 's'],
          [-7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1.5s" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a an allowed duration with a duration of 0', () => {
      const payload = '10s';
      const decoded = TimeDuration({
        allowedDurations: [
          [0, 's'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "[[0,"s"],[7,"d"]]" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a TimeDuration with an invalid time unit', () => {
      const payload = '10000000days';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 'h'],
          [1, 'd'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "10000000days" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a TimeDuration with a time interval with incorrect format', () => {
      const payload = '100ff0000w';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 'h'],
          [1, 'd'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "100ff0000w" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an empty string', () => {
      const payload = '';
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 'h'],
          [1, 'd'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an number', () => {
      const payload = 100;
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 'h'],
          [1, 'd'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "100" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an TimeDuration with a valid time unit but unsafe integer', () => {
      const payload = `${Math.pow(2, 53)}h`;
      const decoded = TimeDuration({
        allowedDurations: [
          [1, 'h'],
          [1, 'd'],
          [7, 'd'],
        ],
      }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        `Invalid value "${Math.pow(2, 53)}h" supplied to "TimeDuration"`,
      ]);
      expect(message.schema).toEqual({});
    });
  });
  describe('with allowedUnits', () => {
    test('it should validate a correctly formed TimeDuration with time unit of seconds', () => {
      const payload = '1s';
      const decoded = TimeDuration({ allowedUnits: ['s'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a correctly formed TimeDuration with time unit of minutes', () => {
      const payload = '100m';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a correctly formed TimeDuration with time unit of hours', () => {
      const payload = '10000000h';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a correctly formed TimeDuration with time unit of days', () => {
      const payload = '7d';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate a correctly formed TimeDuration with time unit of seconds if it is not an allowed unit', () => {
      const payload = '30s';
      const decoded = TimeDuration({ allowedUnits: ['m', 'h', 'd'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "30s" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a negative TimeDuration', () => {
      const payload = '-10s';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "-10s" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a fractional number', () => {
      const payload = '1.5s';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1.5s" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a TimeDuration with an invalid time unit', () => {
      const payload = '10000000days';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "10000000days" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a TimeDuration with a time interval with incorrect format', () => {
      const payload = '100ff0000w';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "100ff0000w" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an empty string', () => {
      const payload = '';
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an number', () => {
      const payload = 100;
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "100" supplied to "TimeDuration"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an TimeDuration with a valid time unit but unsafe integer', () => {
      const payload = `${Math.pow(2, 53)}h`;
      const decoded = TimeDuration({ allowedUnits: ['s', 'm', 'h'] }).decode(payload);
      const message = foldLeftRight(decoded);

      expect(getPaths(left(message.errors))).toEqual([
        `Invalid value "${Math.pow(2, 53)}h" supplied to "TimeDuration"`,
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
