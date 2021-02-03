/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import color from 'color';
import { lightenColor } from './lighten_color';

describe('lighten_color', () => {
  it('should keep existing color if there is a single color step', () => {
    expect(lightenColor('#FF0000', 1, 1)).toEqual('#FF0000');
  });

  it('should keep existing color for the first step', () => {
    expect(lightenColor('#FF0000', 1, 10)).toEqual('#FF0000');
  });

  it('should lighten color', () => {
    const baseLightness = color('#FF0000', 'hsl').lightness();
    const result1 = lightenColor('#FF0000', 5, 10);
    const result2 = lightenColor('#FF0000', 10, 10);
    expect(baseLightness).toBeLessThan(color(result1, 'hsl').lightness());
    expect(color(result1, 'hsl').lightness()).toBeLessThan(color(result2, 'hsl').lightness());
  });

  it('should not exceed top lightness', () => {
    const result = lightenColor('#c0c0c0', 10, 10);
    expect(color(result, 'hsl').lightness()).toBeLessThan(95);
  });
});
