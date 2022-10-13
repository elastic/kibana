/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { shallowWithI18nProvider, mountWithIntl } from '@kbn/test-jest-helpers';
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

  const props: ImportModeControlProps = { initialValues, updateSelection };

  it('returns full import mode control', async () => {
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
