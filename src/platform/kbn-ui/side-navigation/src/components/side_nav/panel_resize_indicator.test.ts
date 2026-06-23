/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildStretchBandPath } from './panel_resize_indicator';

describe('buildStretchBandPath', () => {
  const baseParams = {
    height: 100,
    primaryX: 200,
    stretchLeft: 0,
    stretchRight: 0,
    pointerY: 50,
    baseHalfWidth: 8,
  };

  it('builds a rectangle when not stretching', () => {
    expect(buildStretchBandPath(baseParams)).toBe('M 192 0 L 208 0 L 208 100 L 192 100 Z');
  });

  it('builds a left bulge using a quadratic curve at the pointer', () => {
    expect(buildStretchBandPath({ ...baseParams, stretchLeft: 20 })).toBe(
      'M 208 0 L 208 100 L 192 100 Q 172 50 192 0 Z'
    );
  });

  it('builds a right bulge using a quadratic curve at the pointer', () => {
    expect(buildStretchBandPath({ ...baseParams, stretchRight: 20 })).toBe(
      'M 192 0 L 192 100 L 208 100 Q 228 50 208 0 Z'
    );
  });
});
