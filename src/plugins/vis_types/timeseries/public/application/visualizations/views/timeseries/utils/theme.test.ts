/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getBaseTheme } from './theme';
import { LEGACY_LIGHT_THEME, LEGACY_DARK_THEME } from '@elastic/charts';

describe('TSVB theme', () => {
  it('should return the basic themes if no bg color is specified', () => {
    // use original dark/light theme
    expect(getBaseTheme(LEGACY_LIGHT_THEME)).toEqual(LEGACY_LIGHT_THEME);
    expect(getBaseTheme(LEGACY_DARK_THEME)).toEqual(LEGACY_DARK_THEME);

    // discard any wrong/missing bg color
    expect(getBaseTheme(LEGACY_DARK_THEME, null)).toEqual(LEGACY_DARK_THEME);
    expect(getBaseTheme(LEGACY_DARK_THEME, '')).toEqual(LEGACY_DARK_THEME);
    expect(getBaseTheme(LEGACY_DARK_THEME, undefined)).toEqual(LEGACY_DARK_THEME);
  });
  it('should return a highcontrast color theme for a different background', () => {
    // red use a near full-black color
    expect(getBaseTheme(LEGACY_LIGHT_THEME, 'red').axes.axisTitle.fill).toEqual('rgb(23,23,23)');

    // violet increased the text color to full white for higer contrast
    expect(getBaseTheme(LEGACY_LIGHT_THEME, '#ba26ff').axes.axisTitle.fill).toEqual(
      'rgb(255,255,255)'
    );

    // light yellow, prefer the LEGACY_LIGHT_THEME fill color because already with a good contrast
    expect(getBaseTheme(LEGACY_LIGHT_THEME, '#fff49f').axes.axisTitle.fill).toEqual('#333');
  });
});
