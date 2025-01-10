/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { decreaseOpacity } from './decrease_opacity';

describe('decrease_opacity', () => {
  it('should keep existing color if there is a single color step', () => {
    expect(decreaseOpacity('#FF0000', 1, 1)).toEqual('#FF0000');
  });

  it('should keep existing color for the first step', () => {
    expect(decreaseOpacity('#FF0000', 1, 10)).toEqual('#FF0000');
  });

  it('should decrease color opacity', () => {
    const baseColor = '#FF0000';

    const color1 = chroma(decreaseOpacity(baseColor, 2, 4));
    const color2 = chroma(decreaseOpacity(baseColor, 3, 4));

    expect(chroma(baseColor).luminance()).toBeLessThan(color1.luminance());
    expect(color1.luminance()).toBeLessThan(color2.luminance());
  });

  it('should not exceed top luminance', () => {
    const result = decreaseOpacity('#000', 12, 10);

    expect(chroma(result).luminance()).toBeLessThan(0.8);
  });
});
