/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UiSettingsParams } from '../../../types';
import { getNavigationSettings } from './navigation';

describe('navigation settings', () => {
  const navigationSettings = getNavigationSettings();

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('defaultRoute', () => {
    const validate = getValidationFn(navigationSettings.defaultRoute);

    it('should only accept relative urls', () => {
      expect(() => validate('/some-url')).not.toThrow();
      expect(() => validate('http://some-url')).toThrowErrorMatchingInlineSnapshot(
        `"Must be a relative URL."`
      );
      expect(() => validate(125)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [number]"`
      );
    });
  });

  describe('pageNavigation', () => {
    const validate = getValidationFn(navigationSettings.pageNavigation);

    it('should only accept valid values', () => {
      expect(() => validate('modern')).not.toThrow();
      expect(() => validate('legacy')).not.toThrow();
      expect(() => validate('invalid')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value to equal [modern]
- [1]: expected value to equal [legacy]"
`);
    });
  });
});
