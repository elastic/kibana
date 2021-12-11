/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getScale } from './get_axis';
import type { Scale } from '../types';

describe('getScale', () => {
  const axisScale = {
    type: 'linear',
    mode: 'normal',
    scaleType: 'linear',
  } as Scale;

  it('returns linear type for a number', () => {
    const format = { id: 'number' };
    const scale = getScale(axisScale, {}, format, true);
    expect(scale.type).toBe('linear');
  });

  it('returns ordinal type for a terms aggregation on a number field', () => {
    const format = {
      id: 'terms',
      params: {
        id: 'number',
        otherBucketLabel: 'Other',
        missingBucketLabel: 'Missing',
      },
    };
    const scale = getScale(axisScale, {}, format, true);
    expect(scale.type).toBe('ordinal');
  });

  it('returns ordinal type for a terms aggregation on a string field', () => {
    const format = {
      id: 'terms',
      params: {
        id: 'string',
        otherBucketLabel: 'Other',
        missingBucketLabel: 'Missing',
      },
    };
    const scale = getScale(axisScale, {}, format, true);
    expect(scale.type).toBe('ordinal');
  });

  it('returns ordinal type for a range aggregation on a number field', () => {
    const format = {
      id: 'range',
      params: {
        id: 'number',
      },
    };
    const scale = getScale(axisScale, {}, format, true);
    expect(scale.type).toBe('ordinal');
  });

  it('returns time type for a date histogram aggregation', () => {
    const format = {
      id: 'date',
      params: {
        pattern: 'HH:mm',
      },
    };
    const scale = getScale(axisScale, { date: true }, format, true);
    expect(scale.type).toBe('time');
  });

  it('returns linear type for an histogram aggregation', () => {
    const format = { id: 'number' };
    const scale = getScale(axisScale, { interval: 1 }, format, true);
    expect(scale.type).toBe('linear');
  });
});
