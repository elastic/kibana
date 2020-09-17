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
