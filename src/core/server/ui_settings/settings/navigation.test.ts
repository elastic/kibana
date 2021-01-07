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
