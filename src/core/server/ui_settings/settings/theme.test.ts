/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      expect(() => validate('v8 (beta)')).not.toThrow();
      expect(() => validate('v12')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value to equal [v7]
- [1]: expected value to equal [v8 (beta)]"
`);
    });
  });
});
