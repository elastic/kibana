/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { getWeekdayInfo } from './get_weekday_info';

describe('getWeekdayInfo', () => {
  test('should return the fourth tuesday of the month for 11/23/2021', () => {
    expect(getWeekdayInfo(moment('2021-11-23'))).toEqual({
      dayOfWeek: 'Tuesday',
      isLastOfMonth: false,
      nthWeekdayOfMonth: 4,
    });
  });

  test('should return the third Tuesday of the month 11/16/2021', () => {
    expect(getWeekdayInfo(moment('2021-11-16'))).toEqual({
      dayOfWeek: 'Tuesday',
      isLastOfMonth: false,
      nthWeekdayOfMonth: 3,
    });
  });

  test('should return the last Friday of the month 12/25/2020', () => {
    expect(getWeekdayInfo(moment('2020-12-25'))).toEqual({
      dayOfWeek: 'Friday',
      isLastOfMonth: true,
      nthWeekdayOfMonth: 4,
    });
  });

  test('should return expected invalid props for a null date', () => {
    expect(getWeekdayInfo(moment(null))).toEqual({
      dayOfWeek: 'Invalid date',
      isLastOfMonth: true,
      nthWeekdayOfMonth: NaN,
    });
  });
});
