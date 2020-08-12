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

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { shallowWithI18nProvider, mountWithIntl } from 'test_utils/enzyme_helpers';
import { ImportModeControl, ImportModeControlProps } from './import_mode_control';

describe('ImportModeControl', () => {
  const initialValues = { createNewCopies: false, overwrite: true }; // some test cases below make assumptions based on these initial values
  const updateSelection = jest.fn();

  const getOverwriteRadio = (wrapper: ReactWrapper) =>
    wrapper.find(
      'EuiRadioGroup[data-test-subj="savedObjectsManagement-importModeControl-overwriteRadioGroup"]'
    );
  const getOverwriteEnabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="overwriteEnabled"]');
  const getOverwriteDisabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="overwriteDisabled"]');
  const getCreateNewCopiesDisabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="createNewCopiesDisabled"]');
  const getCreateNewCopiesEnabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="createNewCopiesEnabled"]');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: ImportModeControlProps = { initialValues, updateSelection, isLegacyFile: false };

  it('returns partial import mode control when used with a legacy file', async () => {
    const wrapper = shallowWithI18nProvider(<ImportModeControl {...props} isLegacyFile={true} />);
    expect(wrapper.find('EuiFormFieldset')).toHaveLength(0);
  });

  it('returns full import mode control when used without a legacy file', async () => {
    const wrapper = shallowWithI18nProvider(<ImportModeControl {...props} />);
    expect(wrapper.find('EuiFormFieldset')).toHaveLength(1);
  });

  it('should allow the user to toggle `overwrite`', async () => {
    const wrapper = mountWithIntl(<ImportModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    const { createNewCopies } = initialValues;

    getOverwriteDisabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies, overwrite: false });

    getOverwriteEnabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies, overwrite: true });
  });

  it('should disable the Overwrite switch when `createNewCopies` is enabled', async () => {
    const wrapper = mountWithIntl(<ImportModeControl {...props} />);

    expect(getOverwriteRadio(wrapper).prop('disabled')).toBe(false);
    getCreateNewCopiesEnabled(wrapper).simulate('change');
    expect(getOverwriteRadio(wrapper).prop('disabled')).toBe(true);
  });

  it('should allow the user to toggle `createNewCopies`', async () => {
    const wrapper = mountWithIntl(<ImportModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    const { overwrite } = initialValues;

    getCreateNewCopiesEnabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies: true, overwrite });

    getCreateNewCopiesDisabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies: false, overwrite });
  });
});
