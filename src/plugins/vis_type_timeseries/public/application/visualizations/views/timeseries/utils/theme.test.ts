/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getBaseTheme } from './theme';
import { LIGHT_THEME, DARK_THEME } from '@elastic/charts';

describe('TSVB theme', () => {
  it('should return the basic themes if no bg color is specified', () => {
    // use original dark/light theme
    expect(getBaseTheme(LIGHT_THEME)).toEqual(LIGHT_THEME);
    expect(getBaseTheme(DARK_THEME)).toEqual(DARK_THEME);

    // discard any wrong/missing bg color
    expect(getBaseTheme(DARK_THEME, null)).toEqual(DARK_THEME);
    expect(getBaseTheme(DARK_THEME, '')).toEqual(DARK_THEME);
    expect(getBaseTheme(DARK_THEME, undefined)).toEqual(DARK_THEME);
  });
  it('should return a highcontrast color theme for a different background', () => {
    // red use a near full-black color
    expect(getBaseTheme(LIGHT_THEME, 'red').axes.axisTitle.fill).toEqual('rgb(23,23,23)');

    // violet increased the text color to full white for higer contrast
    expect(getBaseTheme(LIGHT_THEME, '#ba26ff').axes.axisTitle.fill).toEqual('rgb(255,255,255)');

    // light yellow, prefer the LIGHT_THEME fill color because already with a good contrast
    expect(getBaseTheme(LIGHT_THEME, '#fff49f').axes.axisTitle.fill).toEqual('#333');
  });
});
