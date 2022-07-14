/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiSettingsParams } from '../../../types';
import { getThemeSettings } from './theme';

describe('theme settings', () => {
  const themeSettings = getThemeSettings();

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('theme:darkMode', () => {
    const validate = getValidationFn(themeSettings['theme:darkMode']);

    it('should only accept boolean values', () => {
      expect(() => validate(true)).not.toThrow();
      expect(() => validate(false)).not.toThrow();
      expect(() => validate('foo')).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [boolean] but got [string]"`
      );
      expect(() => validate(12)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [boolean] but got [number]"`
      );
    });
  });
});

describe('process.env.KBN_OPTIMIZER_THEMES handling', () => {
  it('defaults to properties of first tag', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark,v8light';
    let settings = getThemeSettings({ isDist: false });
    expect(settings['theme:darkMode'].value).toBe(true);

    process.env.KBN_OPTIMIZER_THEMES = 'v8light,v8dark';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:darkMode'].value).toBe(false);
  });

  it('ignores the value when isDist is undefined', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark';
    const settings = getThemeSettings({ isDist: undefined });
    expect(settings['theme:darkMode'].value).toBe(false);
  });

  it('ignores the value when isDist is true', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark';
    const settings = getThemeSettings({ isDist: true });
    expect(settings['theme:darkMode'].value).toBe(false);
  });
});
