/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { clampToViewport } from './clamp_to_viewport';
import { LABEL_PADDING } from '../constants';

describe('clampToViewport', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
  });

  it('should return the position unchanged when fully within the viewport', () => {
    const result = clampToViewport(100, 200, 50, 20);
    expect(result).toEqual({ left: 100, top: 200 });
  });

  it('should clamp left edge when label overflows to the left', () => {
    const result = clampToViewport(-10, 200, 50, 20);
    expect(result.left).toBe(LABEL_PADDING);
  });

  it('should clamp top edge when label overflows above', () => {
    const result = clampToViewport(100, -5, 50, 20);
    expect(result.top).toBe(LABEL_PADDING);
  });

  it('should clamp right edge when label overflows to the right', () => {
    const result = clampToViewport(970, 200, 50, 20);
    // 1000 - 50 - 4 = 946
    expect(result.left).toBe(1000 - 50 - LABEL_PADDING);
  });

  it('should clamp bottom edge when label overflows below', () => {
    const result = clampToViewport(100, 790, 50, 20);
    // 800 - 20 - 4 = 776
    expect(result.top).toBe(800 - 20 - LABEL_PADDING);
  });

  it('should clamp both axes when overflowing bottom-right corner', () => {
    const result = clampToViewport(980, 790, 60, 30);
    expect(result.left).toBe(1000 - 60 - LABEL_PADDING);
    expect(result.top).toBe(800 - 30 - LABEL_PADDING);
  });

  it('should clamp both axes when overflowing top-left corner', () => {
    const result = clampToViewport(-20, -10, 50, 20);
    expect(result.left).toBe(LABEL_PADDING);
    expect(result.top).toBe(LABEL_PADDING);
  });

  it('should handle zero-size labels', () => {
    const result = clampToViewport(500, 400, 0, 0);
    expect(result).toEqual({ left: 500, top: 400 });
  });

  it('should handle labels exactly at the viewport edge', () => {
    // Label of width 50 at left=946 → right edge = 996, max = 1000-4 = 996 → fits exactly
    const result = clampToViewport(946, 776, 50, 20);
    expect(result).toEqual({ left: 946, top: 776 });
  });
});
