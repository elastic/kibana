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

  describe('theme:version', () => {
    const validate = getValidationFn(themeSettings['theme:version']);

    it('should only accept valid values', () => {
      expect(() => validate('v7')).not.toThrow();
      expect(() => validate('v8')).not.toThrow();
      expect(() => validate('v12')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value to equal [v7]
- [1]: expected value to equal [v8]"
`);
    });
  });
});

describe('process.env.KBN_OPTIMIZER_THEMES handling', () => {
  it('provides valid options based on tags', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v7light,v8dark';
    let settings = getThemeSettings({ isDist: false });
    expect(settings['theme:version'].options).toEqual(['v7', 'v8']);

    process.env.KBN_OPTIMIZER_THEMES = 'v8dark,v7light';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:version'].options).toEqual(['v7', 'v8']);

    process.env.KBN_OPTIMIZER_THEMES = 'v8dark,v7light,v7dark,v8light';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:version'].options).toEqual(['v7', 'v8']);

    process.env.KBN_OPTIMIZER_THEMES = '*';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:version'].options).toEqual(['v7', 'v8']);

    process.env.KBN_OPTIMIZER_THEMES = 'v7light';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:version'].options).toEqual(['v7']);

    process.env.KBN_OPTIMIZER_THEMES = 'v8light';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:version'].options).toEqual(['v8']);
  });

  it('defaults to properties of first tag', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark,v7light';
    let settings = getThemeSettings({ isDist: false });
    expect(settings['theme:darkMode'].value).toBe(true);
    expect(settings['theme:version'].value).toBe('v8');

    process.env.KBN_OPTIMIZER_THEMES = 'v7light,v8dark';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:darkMode'].value).toBe(false);
    expect(settings['theme:version'].value).toBe('v7');
  });

  it('ignores the value when isDist is undefined', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v7light';
    const settings = getThemeSettings({ isDist: undefined });
    expect(settings['theme:darkMode'].value).toBe(false);
    expect(settings['theme:version'].options).toEqual(['v7', 'v8']);
  });

  it('ignores the value when isDist is true', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v7light';
    const settings = getThemeSettings({ isDist: true });
    expect(settings['theme:darkMode'].value).toBe(false);
    expect(settings['theme:version'].options).toEqual(['v7', 'v8']);
  });
});
