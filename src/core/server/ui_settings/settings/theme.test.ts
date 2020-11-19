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
