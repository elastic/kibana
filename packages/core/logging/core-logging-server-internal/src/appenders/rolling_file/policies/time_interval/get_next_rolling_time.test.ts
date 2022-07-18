/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { schema } from '@kbn/config-schema';
import { getNextRollingTime } from './get_next_rolling_time';

const format = 'YYYY-MM-DD HH:mm:ss:SSS';

const formattedRollingTime = (date: string, duration: string, modulate: boolean) =>
  moment(
    getNextRollingTime(
      moment(date, format).toDate().getTime(),
      schema.duration().validate(duration),
      modulate
    )
  ).format(format);

describe('getNextRollingTime', () => {
  describe('when `modulate` is false', () => {
    it('increments the current time by the interval', () => {
      expect(formattedRollingTime('2010-10-20 04:27:12:000', '15m', false)).toEqual(
        '2010-10-20 04:42:12:000'
      );

      expect(formattedRollingTime('2010-02-12 04:27:12:000', '24h', false)).toEqual(
        '2010-02-13 04:27:12:000'
      );

      expect(formattedRollingTime('2010-02-17 06:34:55', '2d', false)).toEqual(
        '2010-02-19 06:34:55:000'
      );
    });
  });

  describe('when `modulate` is true', () => {
    it('increments the current time to reach the next boundary', () => {
      expect(formattedRollingTime('2010-10-20 04:27:12:512', '30m', true)).toEqual(
        '2010-10-20 04:30:00:000'
      );
      expect(formattedRollingTime('2010-10-20 04:27:12:512', '6h', true)).toEqual(
        '2010-10-20 06:00:00:000'
      );
      expect(formattedRollingTime('2010-10-20 04:27:12:512', '1w', true)).toEqual(
        '2010-10-24 00:00:00:000'
      );
    });

    it('works when on the edge of a boundary', () => {
      expect(formattedRollingTime('2010-10-20 06:00:00:000', '6h', true)).toEqual(
        '2010-10-20 12:00:00:000'
      );
      expect(formattedRollingTime('2010-10-14 00:00:00:000', '1d', true)).toEqual(
        '2010-10-15 00:00:00:000'
      );
      expect(formattedRollingTime('2010-01-03 00:00:00:000', '2w', true)).toEqual(
        '2010-01-17 00:00:00:000'
      );
    });

    it('increments a higher unit when necessary', () => {
      expect(formattedRollingTime('2010-10-20 21:00:00:000', '9h', true)).toEqual(
        '2010-10-21 03:00:00:000'
      );
      expect(formattedRollingTime('2010-12-31 21:00:00:000', '4d', true)).toEqual(
        '2011-01-03 00:00:00:000'
      );
    });
  });
});
