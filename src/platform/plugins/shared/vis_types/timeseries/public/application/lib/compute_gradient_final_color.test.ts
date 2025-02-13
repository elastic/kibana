/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeGradientFinalColor } from './compute_gradient_final_color';

describe('computeGradientFinalColor Function', () => {
  it('Should compute the gradient final color correctly for rgb color', () => {
    const color = computeGradientFinalColor('rgba(211,96,134,1)');
    expect(color).toEqual('rgb(145, 40, 75)');
  });

  it('Should compute the gradient final color correctly for hex color', () => {
    const color = computeGradientFinalColor('#6092C0');
    expect(color).toEqual('rgb(43, 77, 108)');
  });
});
