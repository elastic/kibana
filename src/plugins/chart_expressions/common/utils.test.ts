/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartialTheme } from '@elastic/charts';
import { getOverridesFor, mergeThemeWithOverrides } from './utils';

describe('Overrides utilities', () => {
  describe('getOverridesFor', () => {
    it('should return an empty object for undefined values', () => {
      expect(getOverridesFor(undefined, 'settings')).toEqual({});
      // @ts-expect-error
      expect(getOverridesFor({}, 'settings')).toEqual({});
      // @ts-expect-error
      expect(getOverridesFor({ otherOverride: {} }, 'settings')).toEqual({});
    });

    it('should return only the component specific overrides', () => {
      expect(
        getOverridesFor({ otherOverride: { a: 15 }, settings: { b: 10 } }, 'settings')
      ).toEqual({ b: 10 });
    });

    it('should swap any "ignore" value into undefined value', () => {
      expect(
        getOverridesFor({ otherOverride: { a: 15 }, settings: { b: 10, c: 'ignore' } }, 'settings')
      ).toEqual({ b: 10, c: undefined });
    });
  });

  describe('mergeThemeWithOverrides', () => {
    const baseTheme: PartialTheme = {
      legend: {
        labelOptions: {
          maxLines: 1,
        },
      },
      chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    };
    const themeWithComponentStyle = {
      ...baseTheme,
      areaSeriesStyle: { fit: { line: { visible: true } } },
    };
    it('should not fail with no theme overrides passed', () => {
      expect(mergeThemeWithOverrides(baseTheme, undefined, ['areaSeriesStyle'])).toEqual(baseTheme);
      expect(mergeThemeWithOverrides(baseTheme, {}, ['areaSeriesStyle'])).toEqual(baseTheme);
      expect(mergeThemeWithOverrides(themeWithComponentStyle, {}, ['areaSeriesStyle'])).toEqual(
        themeWithComponentStyle
      );
    });

    it('should augment the base theme styling with ', () => {
      expect(
        mergeThemeWithOverrides(baseTheme, { chartPaddings: { top: 0 } }, ['areaSeriesStyle'])
      ).toEqual({ ...baseTheme, chartPaddings: { top: 0 } });
      expect(
        mergeThemeWithOverrides(themeWithComponentStyle, { chartPaddings: { top: 0 } }, [
          'areaSeriesStyle',
        ])
      ).toEqual({ ...themeWithComponentStyle, chartPaddings: { top: 0 } });
    });

    it('should merge the requested component theme correctly at the root level', () => {
      expect(
        mergeThemeWithOverrides(
          themeWithComponentStyle,
          { lineSeriesStyle: { line: { visible: true } } },
          ['areaSeriesStyle']
        )
      ).toEqual({ ...themeWithComponentStyle, lineSeriesStyle: { line: { visible: true } } });
    });

    it('should let overwrite the component theme when required', () => {
      expect(
        mergeThemeWithOverrides(
          themeWithComponentStyle,
          { areaSeriesStyle: { fit: { line: { visible: false } } } },
          ['areaSeriesStyle']
        )
      ).toEqual({ ...baseTheme, areaSeriesStyle: { fit: { line: { visible: false } } } });
    });

    it('should work for multiple component overrides', () => {
      expect(
        mergeThemeWithOverrides(
          { ...themeWithComponentStyle, lineSeriesStyle: { line: { visible: true } } },
          {
            areaSeriesStyle: { line: { visible: false } },
            lineSeriesStyle: { line: { visible: false } },
          },
          ['areaSeriesStyle', 'lineSeriesStyle']
        )
      ).toEqual({
        ...baseTheme,
        areaSeriesStyle: { fit: { line: { visible: true } }, line: { visible: false } },
        lineSeriesStyle: { line: { visible: false } },
      });
    });
  });
});
