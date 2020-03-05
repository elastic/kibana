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

import expect from '@kbn/expect';
import { isDefaultValue } from './is_default_value';
import { UiSettingsType } from '../../../../../core/public';

describe('Settings', function() {
  describe('Advanced', function() {
    describe('getCategoryName(category)', function() {
      describe('when given a setting definition object', function() {
        const setting = {
          isCustom: false,
          value: 'value',
          defVal: 'defaultValue',
          displayName: 'displayName',
          name: 'name',
          ariaName: 'ariaName',
          description: 'description',
          requiresPageReload: false,
          type: 'string' as UiSettingsType,
          isOverridden: false,
          readOnly: false,
          options: [],
          optionLabels: { option: 'label' },
          category: ['category'],
          validation: { regex: /regexString/, message: 'validation description' },
        };

        describe('that is custom', function() {
          it('should return true', function() {
            expect(isDefaultValue({ ...setting, isCustom: true })).to.be(true);
          });
        });

        describe('without a value', function() {
          it('should return true', function() {
            expect(isDefaultValue({ ...setting, value: undefined })).to.be(true);
            expect(isDefaultValue({ ...setting, value: '' })).to.be(true);
          });
        });

        describe('with a value that is the same as the default value', function() {
          it('should return true', function() {
            expect(isDefaultValue({ ...setting, value: 'defaultValue' })).to.be(true);
            expect(isDefaultValue({ ...setting, value: [], defVal: [] })).to.be(true);
            expect(
              isDefaultValue({ ...setting, value: '{"foo":"bar"}', defVal: '{"foo":"bar"}' })
            ).to.be(true);
            expect(isDefaultValue({ ...setting, value: 123, defVal: 123 })).to.be(true);
            expect(isDefaultValue({ ...setting, value: 456, defVal: '456' })).to.be(true);
            expect(isDefaultValue({ ...setting, value: false, defVal: false })).to.be(true);
          });
        });

        describe('with a value that is different than the default value', function() {
          it('should return false', function() {
            expect(isDefaultValue({ ...setting })).to.be(false);
            expect(isDefaultValue({ ...setting, value: [1], defVal: [2] })).to.be(false);
            expect(
              isDefaultValue({ ...setting, value: '{"foo":"bar"}', defVal: '{"foo2":"bar2"}' })
            ).to.be(false);
            expect(isDefaultValue({ ...setting, value: 123, defVal: 1234 })).to.be(false);
            expect(isDefaultValue({ ...setting, value: 456, defVal: '4567' })).to.be(false);
            expect(isDefaultValue({ ...setting, value: true, defVal: false })).to.be(false);
          });
        });
      });
    });
  });
});
