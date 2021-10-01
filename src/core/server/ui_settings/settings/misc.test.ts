/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiSettingsParams } from '../../../types';
import { getMiscUiSettings } from './misc';

describe('misc settings', () => {
  const miscSettings = getMiscUiSettings();

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('truncate:maxHeight', () => {
    const validate = getValidationFn(miscSettings['truncate:maxHeight']);

    it('should only accept positive numeric values', () => {
      expect(() => validate(127)).not.toThrow();
      expect(() => validate(-12)).toThrowErrorMatchingInlineSnapshot(
        `"Value must be equal to or greater than [0]."`
      );
      expect(() => validate('foo')).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [number] but got [string]"`
      );
    });
  });
});
