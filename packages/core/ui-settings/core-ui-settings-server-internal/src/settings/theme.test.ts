/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { getThemeSettings } from './theme';

describe('theme settings', () => {
  const themeSettings = getThemeSettings();

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
});

describe('process.env.KBN_OPTIMIZER_THEMES handling', () => {
  it('defaults to properties of first tag', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark,v8light';
    let settings = getThemeSettings({ isDist: false });
    expect(settings['theme:darkMode'].value).toBe('enabled');

    process.env.KBN_OPTIMIZER_THEMES = 'v8light,v8dark';
    settings = getThemeSettings({ isDist: false });
    expect(settings['theme:darkMode'].value).toBe('disabled');
  });

  it('ignores the value when isDist is undefined', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark';
    const settings = getThemeSettings({ isDist: undefined });
    expect(settings['theme:darkMode'].value).toBe('disabled');
  });

  it('ignores the value when isDist is true', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8dark';
    const settings = getThemeSettings({ isDist: true });
    expect(settings['theme:darkMode'].value).toBe('disabled');
  });
});
