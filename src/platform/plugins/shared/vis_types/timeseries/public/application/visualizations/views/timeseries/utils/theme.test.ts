/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBaseTheme, getChartClasses } from './theme';
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

  describe('getChartClasses', () => {
    it('keeps the theme of the surrounding page if no bg color is specified', () => {
      expect(getChartClasses()).toBeUndefined();
    });

    it('returns the light class for a light background color', () => {
      expect(getChartClasses('#FFFFFF')).toBe('tvbVisTimeSeriesLight');
      expect(getChartClasses('#fff49f')).toBe('tvbVisTimeSeriesLight');
    });

    it('returns the dark class for a dark background color', () => {
      expect(getChartClasses('#000000')).toBe('tvbVisTimeSeriesDark');
      expect(getChartClasses('#333333')).toBe('tvbVisTimeSeriesDark');
    });
  });
});
