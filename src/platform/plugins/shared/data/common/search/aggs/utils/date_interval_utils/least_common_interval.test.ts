/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { leastCommonInterval } from './least_common_interval';

describe('leastCommonInterval', () => {
  it('should correctly return lowest common interval for fixed units', () => {
    expect(leastCommonInterval('1ms', '1s')).toBe('1s');
    expect(leastCommonInterval('500ms', '1s')).toBe('1s');
    expect(leastCommonInterval('1000ms', '1s')).toBe('1s');
    expect(leastCommonInterval('1500ms', '1s')).toBe('3s');
    expect(leastCommonInterval('1234ms', '1s')).toBe('617s');
    expect(leastCommonInterval('1s', '2m')).toBe('2m');
    expect(leastCommonInterval('300s', '2m')).toBe('10m');
    expect(leastCommonInterval('1234ms', '7m')).toBe('4319m');
    expect(leastCommonInterval('45m', '2h')).toBe('6h');
    expect(leastCommonInterval('12h', '4d')).toBe('4d');
    expect(leastCommonInterval('  20 h', '7d')).toBe('35d');
  });

  it('should correctly return lowest common interval for calendar units', () => {
    expect(leastCommonInterval('1m', '1h')).toBe('1h');
    expect(leastCommonInterval('1h', '1d')).toBe('1d');
    expect(leastCommonInterval('1d', '1w')).toBe('1w');
    expect(leastCommonInterval('1w', '1M')).toBe('1M');
    expect(leastCommonInterval('1M', '1y')).toBe('1y');
    expect(leastCommonInterval('1M', '1m')).toBe('1M');
    expect(leastCommonInterval('1y', '1w')).toBe('1y');
  });

  it('should throw an error for intervals of different types', () => {
    expect(() => {
      leastCommonInterval('60 s', '1m');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1m', '2m');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1h', '2h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1d', '7d');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1h', '3d');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('7d', '1w');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1M', '1000ms');
    }).toThrowError();
  });

  it('should throw an error for invalid intervals', () => {
    expect(() => {
      leastCommonInterval('foo', 'bar');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('0h', '1h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('0.5h', '1h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('5w', '1h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('2M', '4w');
    }).toThrowError();
  });
});
