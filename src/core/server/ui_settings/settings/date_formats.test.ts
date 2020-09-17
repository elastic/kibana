/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
