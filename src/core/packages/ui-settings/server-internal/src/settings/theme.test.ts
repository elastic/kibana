/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { getThemeSettings, type GetThemeSettingsOptions } from './theme';

const defaultOptions: GetThemeSettingsOptions = {
  isDist: true,
  isThemeSwitcherEnabled: undefined,
};

describe('theme settings', () => {
  const themeSettings = getThemeSettings(defaultOptions);

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('theme:darkMode', () => {
    const validate = getValidationFn(themeSettings['theme:darkMode']);

    it('should only accept expected values', () => {
      expect(() => validate(true)).not.toThrow();
      expect(() => validate(false)).not.toThrow();

      expect(() => validate('enabled')).not.toThrow();
      expect(() => validate('disabled')).not.toThrow();
      expect(() => validate('system')).not.toThrow();

      expect(() => validate('foo')).toThrowError();
      expect(() => validate(12)).toThrowError();
    });
  });

  describe('theme:name', () => {
    const validate = getValidationFn(themeSettings['theme:name']);

    it('should only accept expected values', () => {
      // TODO: Remove amsterdam theme
      // https://github.com/elastic/eui-private/issues/170
      expect(() => validate('amsterdam')).not.toThrow();
      expect(() => validate('borealis')).not.toThrow();

      expect(() => validate(true)).toThrow();
      expect(() => validate(12)).toThrow();
    });

    describe('readonly', () => {
      it('should not be editable when `isThemeSwitcherEnabled` is falsy', () => {
        expect(getThemeSettings(defaultOptions)['theme:name'].readonly).toBe(true);
        expect(
          getThemeSettings({
            ...defaultOptions,
            isThemeSwitcherEnabled: false,
          })['theme:name'].readonly
        ).toBe(true);
      });

      it('should be editable when `isThemeSwitcherEnabled = true`', () => {
        expect(
          getThemeSettings({ ...defaultOptions, isThemeSwitcherEnabled: true })['theme:name']
            .readonly
        ).toBe(false);
        expect(
          getThemeSettings({
            ...defaultOptions,
            isThemeSwitcherEnabled: true,
          })['theme:name'].readonly
        ).toBe(false);
      });
    });

    describe('value', () => {
      it('should default to `borealis`', () => {
        expect(getThemeSettings(defaultOptions)['theme:name'].value).toBe('borealis');
      });

      it('should use the `defaultTheme` value when defined', () => {
        expect(
          getThemeSettings({
            ...defaultOptions,
            defaultTheme: 'amsterdam',
          })['theme:name'].value
        ).toBe('amsterdam');
      });
    });
  });
});

describe('process.env.KBN_OPTIMIZER_THEMES handling', () => {
  it('defaults to properties of first tag', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark,v8light';
    let settings = getThemeSettings({ ...defaultOptions, isDist: false });
    expect(settings['theme:darkMode'].value).toBe('enabled');

    process.env.KBN_OPTIMIZER_THEMES = 'v8light,v8dark';
    settings = getThemeSettings({ ...defaultOptions, isDist: false });
    expect(settings['theme:darkMode'].value).toBe('disabled');
  });

  it('ignores the value when isDist is true', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark';
    const settings = getThemeSettings({ ...defaultOptions, isDist: true });
    expect(settings['theme:darkMode'].value).toBe('disabled');
  });
});
