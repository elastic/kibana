/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { isDefaultValue } from './is_default_value';
import { UiSettingsType } from '@kbn/core/public';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getCategoryName(category)', function () {
      describe('when given a setting definition object', function () {
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

        describe('that is custom', function () {
          it('should return true', function () {
            expect(isDefaultValue({ ...setting, isCustom: true })).to.be(true);
          });
        });

        describe('without a value', function () {
          it('should return false for empty string but true for undefined', function () {
            expect(isDefaultValue({ ...setting, value: undefined })).to.be(true);
            expect(isDefaultValue({ ...setting, value: '' })).to.be(false);
          });
        });

        describe('with a value that is the same as the default value', function () {
          it('should return true', function () {
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

        describe('with a value that is different than the default value', function () {
          it('should return false', function () {
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
