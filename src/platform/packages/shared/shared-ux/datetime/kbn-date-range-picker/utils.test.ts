/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW, DATE_TYPE_RELATIVE } from './constants';
import type { TimeRange } from './types';
import { isValidTimeRange } from './utils';

describe('isValidTimeRange', () => {
  const baseRange = (): TimeRange => ({
    value: 'test',
    start: 'now-1d',
    end: 'now',
    startDate: new Date(0),
    endDate: new Date(1000),
    type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
    isNaturalLanguage: false,
    isInvalid: true,
  });

  it('returns false when a date is missing', () => {
    expect(isValidTimeRange({ ...baseRange(), startDate: null })).toBeFalsy();
    expect(isValidTimeRange({ ...baseRange(), endDate: null })).toBeFalsy();
  });

  it('returns false when both types are NOW', () => {
    const range = {
      ...baseRange(),
      type: [DATE_TYPE_NOW, DATE_TYPE_NOW] as TimeRange['type'],
    };

    expect(isValidTimeRange(range)).toBeFalsy();
  });

  it('returns false when start is after end', () => {
    const range = {
      ...baseRange(),
      startDate: new Date(2000),
      endDate: new Date(1000),
    };

    expect(isValidTimeRange(range)).toBeFalsy();
  });

  it('returns true when start is before or equal to end', () => {
    expect(isValidTimeRange(baseRange())).toBeTruthy();
    expect(
      isValidTimeRange({
        ...baseRange(),
        startDate: new Date(500),
        endDate: new Date(500),
        type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
      })
    ).toBeTruthy();
  });
});
