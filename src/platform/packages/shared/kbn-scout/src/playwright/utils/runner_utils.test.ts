/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidUTCDate, formatTime, getPlaywrightGrepTag } from './runner_utils';
import moment from 'moment';
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return {
    ...actualMoment,
    utc: jest.fn((date, fmt) => actualMoment(date, fmt)),
  };
});

describe('isValidUTCDate', () => {
  it('should return true for valid UTC date strings', () => {
    expect(isValidUTCDate('2019-04-27T23:56:51.374Z')).toBe(true);
  });

  it('should return false for invalid date strings', () => {
    expect(isValidUTCDate('invalid-date')).toBe(false);
  });

  it('should return false for valid non-UTC date strings', () => {
    expect(isValidUTCDate('2015-09-19T06:31:44')).toBe(false);
    expect(isValidUTCDate('Sep 19, 2015 @ 06:31:44.000')).toBe(false);
  });
});

describe('formatTime', () => {
  it('should format the time using the default format', () => {
    const mockDate = '2024-12-16T12:00:00.000Z';
    const mockFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
    (moment.utc as jest.Mock).mockReturnValue({ format: () => 'Dec 16, 2024 @ 12:00:00.000' });

    const result = formatTime(mockDate);

    expect(moment.utc).toHaveBeenCalledWith(mockDate, mockFormat);
    expect(result).toBe('Dec 16, 2024 @ 12:00:00.000');
  });

  it('should format the time using a custom format', () => {
    const mockDate = '2024-12-16T12:00:00.000Z';
    const customFormat = 'YYYY-MM-DD';
    (moment.utc as jest.Mock).mockReturnValue({ format: () => '2024-12-16' });

    const result = formatTime(mockDate, customFormat);

    expect(moment.utc).toHaveBeenCalledWith(mockDate, customFormat);
    expect(result).toBe('2024-12-16');
  });
});

describe('getPlaywrightGrepTag', () => {
  it('should return the correct tag for serverless mode', () => {
    const result = getPlaywrightGrepTag('serverless=oblt');
    expect(result).toBe('@svlOblt');
  });

  it('should return the correct tag for stateful mode', () => {
    const result = getPlaywrightGrepTag('stateful');
    expect(result).toBe('@ess');
  });
});
