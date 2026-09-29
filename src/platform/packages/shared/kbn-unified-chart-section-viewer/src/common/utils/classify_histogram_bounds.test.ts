/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { classifyHistogramBounds } from './classify_histogram_bounds';

describe('classifyHistogramBounds', () => {
  it('returns empty when there is no data', () => {
    expect(classifyHistogramBounds(null, null)).toEqual({ status: 'empty' });
    expect(classifyHistogramBounds(undefined, undefined)).toEqual({ status: 'empty' });
  });

  it('returns empty when only one bound is present', () => {
    expect(classifyHistogramBounds(1, null)).toEqual({ status: 'empty' });
  });

  it('returns empty for non-finite bounds', () => {
    expect(classifyHistogramBounds(NaN, 1)).toEqual({ status: 'empty' });
    expect(classifyHistogramBounds(0, Infinity)).toEqual({ status: 'empty' });
  });

  it('returns empty when min is greater than max', () => {
    expect(classifyHistogramBounds(10, 1)).toEqual({ status: 'empty' });
  });

  it('returns point when min equals max', () => {
    expect(classifyHistogramBounds(4.2, 4.2)).toEqual({ status: 'point', value: 4.2 });
    expect(classifyHistogramBounds(0, 0)).toEqual({ status: 'point', value: 0 });
  });

  it('returns range when min and max differ', () => {
    expect(classifyHistogramBounds(-1, 250)).toEqual({ status: 'range', min: -1, max: 250 });
  });

  it('coerces numeric strings and treats other strings as empty', () => {
    expect(classifyHistogramBounds('1.5', '8')).toEqual({ status: 'range', min: 1.5, max: 8 });
    expect(classifyHistogramBounds('', '8')).toEqual({ status: 'empty' });
    expect(classifyHistogramBounds('abc', '8')).toEqual({ status: 'empty' });
  });
});
