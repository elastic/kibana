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

// @ts-expect-error
import { findTestSubject } from '@elastic/eui/lib/test';

describe('ImportModeControl', () => {
  const initialValues = { createNewCopies: false, overwrite: true }; // some test cases below make assumptions based on these initial values
  const updateSelection = jest.fn();

  const getOverwriteSwitch = (wrapper: ReactWrapper) =>
    findTestSubject(wrapper, 'importSavedObjectsImportModeOverwriteSwitch');
  const getRadio = (wrapper: ReactWrapper) =>
    findTestSubject(wrapper, 'importSavedObjectsImportModeRadio');
  const getRadioDisabledOption = (wrapper: ReactWrapper) =>
    getRadio(wrapper).find('input[id="createNewCopiesDisabled"]');
  const getRadioEnabledOption = (wrapper: ReactWrapper) =>
    getRadio(wrapper).find('input[id="createNewCopiesEnabled"]');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('with a legacy file', () => {
    const props: ImportModeControlProps = { initialValues, updateSelection, isLegacyFile: true };

    it('should render as expected', async () => {
      const wrapper = shallowWithI18nProvider(<ImportModeControl {...props} />);

      expect(wrapper).toMatchInlineSnapshot(`
        <EuiSwitch
          checked={true}
          compressed={false}
          data-test-subj="importSavedObjectsImportModeOverwriteSwitch"
          disabled={false}
          label="Automatically try to overwrite conflicts"
          onChange={[Function]}
        />
      `);
    });

    it('should allow the user to toggle `overwrite`', async () => {
      const wrapper = mountWithIntl(<ImportModeControl {...props} />);

      expect(updateSelection).not.toHaveBeenCalled();
      const { createNewCopies } = initialValues;

      getOverwriteSwitch(wrapper).simulate('click');
      expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies, overwrite: false });

      getOverwriteSwitch(wrapper).simulate('click');
      expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies, overwrite: true });
    });
  });

  describe('without a legacy file', () => {
    const props: ImportModeControlProps = { initialValues, updateSelection, isLegacyFile: false };

    it('should render as expected', async () => {
      const wrapper = shallowWithI18nProvider(<ImportModeControl {...props} />);

      expect(wrapper).toMatchInlineSnapshot(`
        <EuiRadioGroup
          data-test-subj="importSavedObjectsImportModeRadio"
          idSelected="createNewCopiesDisabled"
          onChange={[Function]}
          options={
            Array [
              Object {
                "id": "createNewCopiesDisabled",
                "label": <React.Fragment>
                  <React.Fragment>
                    <EuiText>
                      Check for conflicts
                    </EuiText>
                    <EuiSpacer
                      size="xs"
                    />
                    <EuiText
                      color="subdued"
                    >
                      Check if each object was previously copied or imported into the destination space.
                    </EuiText>
                  </React.Fragment>
                  <EuiSpacer
                    size="xs"
                  />
                  <EuiSwitch
                    checked={true}
                    compressed={true}
                    data-test-subj="importSavedObjectsImportModeOverwriteSwitch"
                    disabled={false}
                    label="Automatically try to overwrite conflicts"
                    onChange={[Function]}
                  />
                  <EuiSpacer
                    size="m"
                  />
                </React.Fragment>,
              },
              Object {
                "id": "createNewCopiesEnabled",
                "label": <React.Fragment>
                  <EuiText>
                    Add as copies
                  </EuiText>
                  <EuiSpacer
                    size="xs"
                  />
                  <EuiText
                    color="subdued"
                  >
                    All imported objects will be created with new random IDs.
                  </EuiText>
                </React.Fragment>,
              },
            ]
          }
        />
      `);
    });

    it('should allow the user to toggle `overwrite`', async () => {
      const wrapper = mountWithIntl(<ImportModeControl {...props} />);

      expect(updateSelection).not.toHaveBeenCalled();
      const { createNewCopies } = initialValues;

      getOverwriteSwitch(wrapper).simulate('click');
      expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies, overwrite: false });

      getOverwriteSwitch(wrapper).simulate('click');
      expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies, overwrite: true });
    });

    it('should disable the Overwrite switch when `createNewCopies` is enabled', async () => {
      const wrapper = mountWithIntl(<ImportModeControl {...props} />);

      expect(getOverwriteSwitch(wrapper).prop('disabled')).toBe(false);
      getRadioEnabledOption(wrapper).simulate('change');
      expect(getOverwriteSwitch(wrapper).prop('disabled')).toBe(true);
    });

    it('should allow the user to toggle `createNewCopies`', async () => {
      const wrapper = mountWithIntl(<ImportModeControl {...props} />);

      expect(updateSelection).not.toHaveBeenCalled();
      const { overwrite } = initialValues;

      getRadioEnabledOption(wrapper).simulate('change');
      expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies: true, overwrite });

      getRadioDisabledOption(wrapper).simulate('change');
      expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies: false, overwrite });
    });
  });
});
