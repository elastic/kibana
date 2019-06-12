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
import { shallow } from 'enzyme';
import React from 'react';
import { SavedObjectSaveModal } from './saved_object_save_modal';

import { mountWithIntl } from 'test_utils/enzyme_helpers';

describe('SavedObjectSaveModal', () => {
  it('should render matching snapshot', () => {
    const wrapper = shallow(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('allows specifying custom save button label', () => {
    const wrapper = mountWithIntl(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
        confirmButtonLabel="Save and done"
      />
    );
    expect(wrapper.find('button[data-test-subj="confirmSaveSavedObjectButton"]').text()).toBe(
      'Save and done'
    );
  });
});
