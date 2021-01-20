/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment-timezone';
import { UiSettingsParams } from '../../../types';
import { getDateFormatSettings } from './date_formats';

describe('accessibility settings', () => {
  const dateFormatSettings = getDateFormatSettings();

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('dateFormat', () => {
    const validate = getValidationFn(dateFormatSettings.dateFormat);

    it('should only accept string values', () => {
      expect(() => validate('some format')).not.toThrow();

      expect(() => validate(42)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [number]"`
      );
      expect(() => validate(true)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [boolean]"`
      );
    });
  });

  describe('dateFormat:tz', () => {
    const validate = getValidationFn(dateFormatSettings['dateFormat:tz']);

    it('should only accept valid timezones or `Browser`', () => {
      expect(() => validate('Browser')).not.toThrow();
      expect(() => validate('UTC')).not.toThrow();

      expect(() => validate('EST')).toThrowErrorMatchingInlineSnapshot(`"Invalid timezone: EST"`);
      expect(() => validate('random string')).toThrowErrorMatchingInlineSnapshot(
        `"Invalid timezone: random string"`
      );
    });
  });

  describe('dateFormat:scaled', () => {
    const validate = getValidationFn(dateFormatSettings['dateFormat:scaled']);

    it('should only accept string values', () => {
      expect(() => validate('some format')).not.toThrow();

      expect(() => validate(42)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [number]"`
      );
      expect(() => validate(true)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [boolean]"`
      );
    });
  });

  describe('dateFormat:dow', () => {
    const [validDay] = moment.weekdays();
    const validate = getValidationFn(dateFormatSettings['dateFormat:dow']);

    it('should only accept DOW values', () => {
      expect(() => validate(validDay)).not.toThrow();

      expect(() => validate('invalid value')).toThrowErrorMatchingInlineSnapshot(
        `"Invalid day of week: invalid value"`
      );
      expect(() => validate(true)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [boolean]"`
      );
    });
  });

  describe('dateNanosFormat', () => {
    const validate = getValidationFn(dateFormatSettings.dateNanosFormat);

    it('should only accept string values', () => {
      expect(() => validate('some format')).not.toThrow();

      expect(() => validate(42)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [number]"`
      );
      expect(() => validate(true)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [boolean]"`
      );
    });
  });
});
