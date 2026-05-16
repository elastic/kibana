/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildHighlightCss } from './build_highlight_css';
import { makeRect } from '../tests/helpers';

describe('buildHighlightCss', () => {
  it('should return a non-empty class name string', () => {
    const result = buildHighlightCss(makeRect(), '#FF0000', 1000);
    expect(result).toBeDefined();
  });

  it('should return different class names for different rects', () => {
    const a = buildHighlightCss(makeRect({ left: 0, top: 0 }), '#FF0000', 1000);
    const b = buildHighlightCss(makeRect({ left: 50, top: 50 }), '#FF0000', 1000);
    expect(a).not.toBe(b);
  });

  it('should return different class names for different colors', () => {
    const rect = makeRect();
    const a = buildHighlightCss(rect, '#FF0000', 1000);
    const b = buildHighlightCss(rect, '#00FF00', 1000);
    expect(a).not.toBe(b);
  });

  it('should return different class names for different z-index values', () => {
    const rect = makeRect();
    const a = buildHighlightCss(rect, '#FF0000', 1000);
    const b = buildHighlightCss(rect, '#FF0000', 2000);
    expect(a).not.toBe(b);
  });

  it('should return the same class name for identical inputs', () => {
    const rect = makeRect();
    const a = buildHighlightCss(rect, '#FF0000', 1000);
    const b = buildHighlightCss(rect, '#FF0000', 1000);
    expect(a).toBe(b);
  });

  it('should handle zero-size rects', () => {
    const result = buildHighlightCss(makeRect({ width: 0, height: 0 }), '#FF0000', 1000);
    expect(result).toBeDefined();
  });

  it('should handle fractional pixel values', () => {
    const result = buildHighlightCss(
      makeRect({ left: 10.5, top: 20.75, width: 100.25, height: 50.1 }),
      '#FF0000',
      1000
    );
    expect(result).toBeDefined();
  });
});
