/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dateHistogramInterval } from './date_histogram_interval';

describe('dateHistogramInterval', () => {
  it('should return calender_interval key for calendar intervals', () => {
    expect(dateHistogramInterval('1m')).toEqual({ calendar_interval: '1m' });
    expect(dateHistogramInterval('1h')).toEqual({ calendar_interval: '1h' });
    expect(dateHistogramInterval('1d')).toEqual({ calendar_interval: '1d' });
    expect(dateHistogramInterval('1w')).toEqual({ calendar_interval: '1w' });
    expect(dateHistogramInterval('1M')).toEqual({ calendar_interval: '1M' });
    expect(dateHistogramInterval('1y')).toEqual({ calendar_interval: '1y' });
  });

  it('should return fixed_interval key for fixed intervals', () => {
    expect(dateHistogramInterval('1ms')).toEqual({ fixed_interval: '1ms' });
    expect(dateHistogramInterval('42ms')).toEqual({ fixed_interval: '42ms' });
    expect(dateHistogramInterval('1s')).toEqual({ fixed_interval: '1s' });
    expect(dateHistogramInterval('42s')).toEqual({ fixed_interval: '42s' });
    expect(dateHistogramInterval('42m')).toEqual({ fixed_interval: '42m' });
    expect(dateHistogramInterval('42h')).toEqual({ fixed_interval: '42h' });
    expect(dateHistogramInterval('42d')).toEqual({ fixed_interval: '42d' });
  });

  it('should throw an error on invalid intervals', () => {
    expect(() => dateHistogramInterval('2w')).toThrow();
    expect(() => dateHistogramInterval('2M')).toThrow();
    expect(() => dateHistogramInterval('2y')).toThrow();
    expect(() => dateHistogramInterval('2')).toThrow();
    expect(() => dateHistogramInterval('y')).toThrow();
    expect(() => dateHistogramInterval('0.5h')).toThrow();
  });
});
