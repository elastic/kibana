/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseHistogramBounds } from './classify_histogram_bounds';

describe('parseHistogramBounds', () => {
  it('returns undefined when there is no data', () => {
    expect(parseHistogramBounds(null, null)).toBeUndefined();
    expect(parseHistogramBounds(undefined, undefined)).toBeUndefined();
  });

  it('returns undefined when only one bound is present', () => {
    expect(parseHistogramBounds(1, null)).toBeUndefined();
  });

  it('returns undefined for non-finite bounds', () => {
    expect(parseHistogramBounds(NaN, 1)).toBeUndefined();
    expect(parseHistogramBounds(0, Infinity)).toBeUndefined();
  });

  it('returns undefined when min is greater than max', () => {
    expect(parseHistogramBounds(10, 1)).toBeUndefined();
  });

  it('keeps a point when min equals max', () => {
    expect(parseHistogramBounds(4.2, 4.2)).toEqual({ min: 4.2, max: 4.2 });
    expect(parseHistogramBounds(0, 0)).toEqual({ min: 0, max: 0 });
    expect(parseHistogramBounds(1, 1)).toEqual({ min: 1, max: 1 });
  });

  it('floors the lower bound and ceils the upper bound to hundredths', () => {
    expect(parseHistogramBounds(0.019, 0.019)).toEqual({ min: 0.01, max: 0.02 });
  });

  it('keeps digits past the hundredth when rounding outward', () => {
    expect(parseHistogramBounds(1.00000000004, 1.00000000004)).toEqual({ min: 1, max: 1.01 });
  });

  it('leaves a value that is already on a hundredth unchanged', () => {
    expect(parseHistogramBounds(1, 4.2)).toEqual({ min: 1, max: 4.2 });
    expect(parseHistogramBounds(2.3, 8.7)).toEqual({ min: 2.3, max: 8.7 });
  });

  it('rounds negative bounds outward', () => {
    expect(parseHistogramBounds(-1.019, -1.019)).toEqual({ min: -1.02, max: -1.01 });
  });

  it('returns min and max when min is less than max', () => {
    expect(parseHistogramBounds(-1, 250)).toEqual({ min: -1, max: 250 });
  });

  it('keeps the original bound when rounding cannot produce a finite hundredth', () => {
    expect(parseHistogramBounds(Number.MAX_VALUE, Number.MAX_VALUE)).toEqual({
      min: Number.MAX_VALUE,
      max: Number.MAX_VALUE,
    });
  });

  it('coerces numeric strings and treats other strings as undefined', () => {
    expect(parseHistogramBounds('1.5', '8')).toEqual({ min: 1.5, max: 8 });
    expect(parseHistogramBounds('', '8')).toBeUndefined();
    expect(parseHistogramBounds('abc', '8')).toBeUndefined();
  });
});
