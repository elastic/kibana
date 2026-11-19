/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CHROME_COLOR_PRESETS,
  deriveChromeColors,
  getChromeColorMode,
  isValidHexColor,
  resolveChromeColor,
} from './chrome_color';

describe('chrome color utils', () => {
  describe('isValidHexColor', () => {
    it.each(['#fff', '#0B64DD', '#abcdef'])('accepts %s', (value) => {
      expect(isValidHexColor(value)).toBe(true);
    });

    it.each(['', 'red', '0B64DD', '#12', '#12345', '#1234567', undefined, 5])(
      'rejects %s',
      (value) => {
        expect(isValidHexColor(value)).toBe(false);
      }
    );

    it('accepts every preset', () => {
      CHROME_COLOR_PRESETS.forEach((preset) => expect(isValidHexColor(preset)).toBe(true));
    });
  });

  describe('deriveChromeColors', () => {
    it('derives a lighter and a darker shade than the base', () => {
      const { light, dark } = deriveChromeColors('#0B64DD');
      expect(getChromeColorMode(light)).toBe('light');
      expect(getChromeColorMode(dark)).toBe('dark');
      expect(light).not.toEqual(dark);
    });

    it('returns upper-case 6 digit hex values', () => {
      const { light, dark } = deriveChromeColors('#f00');
      expect(light).toMatch(/^#[0-9A-F]{6}$/);
      expect(dark).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe('resolveChromeColor', () => {
    it('returns undefined without settings or a color', () => {
      expect(resolveChromeColor(undefined, false)).toBeUndefined();
      expect(resolveChromeColor({}, true)).toBeUndefined();
      expect(resolveChromeColor({ chromeColor: '' }, false)).toBeUndefined();
    });

    it('derives from the base color per mode', () => {
      const derived = deriveChromeColors('#0B64DD');
      expect(resolveChromeColor({ chromeColor: '#0B64DD' }, false)).toBe(derived.light);
      expect(resolveChromeColor({ chromeColor: '#0B64DD' }, true)).toBe(derived.dark);
    });

    it('prefers a valid per-mode override', () => {
      const settings = {
        chromeColor: '#0B64DD',
        chromeColorLight: '#EEEEEE',
        chromeColorDark: '#111111',
      };
      expect(resolveChromeColor(settings, false)).toBe('#EEEEEE');
      expect(resolveChromeColor(settings, true)).toBe('#111111');
    });

    it('ignores an invalid override and falls back to the derived shade', () => {
      const derived = deriveChromeColors('#0B64DD');
      expect(resolveChromeColor({ chromeColor: '#0B64DD', chromeColorLight: 'nope' }, false)).toBe(
        derived.light
      );
    });

    it('uses an override even without a base color', () => {
      expect(resolveChromeColor({ chromeColorDark: '#111111' }, true)).toBe('#111111');
      expect(resolveChromeColor({ chromeColorDark: '#111111' }, false)).toBeUndefined();
    });
  });

  describe('getChromeColorMode', () => {
    it('uses the light color mode on light backgrounds', () => {
      expect(getChromeColorMode('#FFFFFF')).toBe('light');
      expect(getChromeColorMode('#ECF1F9')).toBe('light');
    });

    it('uses the dark color mode on dark backgrounds', () => {
      expect(getChromeColorMode('#000000')).toBe('dark');
      expect(getChromeColorMode('#07101F')).toBe('dark');
    });
  });
});
