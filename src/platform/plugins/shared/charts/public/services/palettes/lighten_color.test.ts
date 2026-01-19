/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { lightenColor } from './lighten_color';

describe('lighten_color', () => {
  it('should keep existing color if there is a single color step', () => {
    expect(lightenColor('#ff0000', 1, 1)).toEqual('#ff0000');
  });

  it('should keep existing color for the first step', () => {
    expect(lightenColor('#ff0000', 1, 10)).toEqual('#ff0000');
  });

  it('should lighten color', () => {
    const baseLightness = chroma('#ff0000').get('hsl.l');
    const result1 = lightenColor('#ff0000', 5, 10);
    const result2 = lightenColor('#ff0000', 10, 10);
    expect(baseLightness).toBeLessThan(chroma(result1).get('hsl.l'));
    expect(chroma(result1).get('hsl.l')).toBeLessThan(chroma(result2).get('hsl.l'));
  });

  it('should not exceed top lightness', () => {
    const result = lightenColor('#c0c0c0', 10, 10);
    expect(chroma(result).get('hsl.l')).toBeLessThan(95);
  });
});
