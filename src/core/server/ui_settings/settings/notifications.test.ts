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

import { UiSettingsParams } from '../../../types';
import { getNotificationsSettings } from './notifications';

describe('notifications settings', () => {
  const notificationsSettings = getNotificationsSettings();

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('notifications:banner', () => {
    const validate = getValidationFn(notificationsSettings['notifications:banner']);

    it('should only accept string values', () => {
      expect(() => validate('some text')).not.toThrow();
      expect(() => validate(true)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [boolean]"`
      );
      expect(() => validate(12)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [number]"`
      );
    });
  });

  describe('notifications:lifetime:banner', () => {
    const validate = getValidationFn(notificationsSettings['notifications:lifetime:banner']);

    it('should only accept positive numeric values or `Infinity`', () => {
      expect(() => validate(42)).not.toThrow();
      expect(() => validate('Infinity')).not.toThrow();
      expect(() => validate(-12)).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: Value must be equal to or greater than [0].
- [1]: expected value to equal [Infinity]"
`);
      expect(() => validate('foo')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value of type [number] but got [string]
- [1]: expected value to equal [Infinity]"
`);
    });
  });

  describe('notifications:lifetime:error', () => {
    const validate = getValidationFn(notificationsSettings['notifications:lifetime:error']);

    it('should only accept positive numeric values or `Infinity`', () => {
      expect(() => validate(42)).not.toThrow();
      expect(() => validate('Infinity')).not.toThrow();
      expect(() => validate(-12)).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: Value must be equal to or greater than [0].
- [1]: expected value to equal [Infinity]"
`);
      expect(() => validate('foo')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value of type [number] but got [string]
- [1]: expected value to equal [Infinity]"
`);
    });
  });

  describe('notifications:lifetime:warning', () => {
    const validate = getValidationFn(notificationsSettings['notifications:lifetime:warning']);

    it('should only accept positive numeric values or `Infinity`', () => {
      expect(() => validate(42)).not.toThrow();
      expect(() => validate('Infinity')).not.toThrow();
      expect(() => validate(-12)).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: Value must be equal to or greater than [0].
- [1]: expected value to equal [Infinity]"
`);
      expect(() => validate('foo')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value of type [number] but got [string]
- [1]: expected value to equal [Infinity]"
`);
    });
  });

  describe('notifications:lifetime:info', () => {
    const validate = getValidationFn(notificationsSettings['notifications:lifetime:info']);

    it('should only accept positive numeric values or `Infinity`', () => {
      expect(() => validate(42)).not.toThrow();
      expect(() => validate('Infinity')).not.toThrow();
      expect(() => validate(-12)).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: Value must be equal to or greater than [0].
- [1]: expected value to equal [Infinity]"
`);
      expect(() => validate('foo')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value of type [number] but got [string]
- [1]: expected value to equal [Infinity]"
`);
    });
  });
});
