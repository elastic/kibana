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

import { mountWithIntl } from '@kbn/test/jest';

describe('SavedObjectSaveModal', () => {
  it('should render matching snapshot', () => {
    const wrapper = shallow(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
        showDescription={true}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render matching snapshot when given options', () => {
    const wrapper = shallow(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
        showDescription={true}
        options={<div>Hello! Main options</div>}
        rightOptions={<div>Hey there! Options on the right</div>}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render matching snapshot when custom isValid is set', () => {
    const falseWrapper = shallow(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
        showDescription={true}
        isValid={false}
      />
    );
    expect(falseWrapper).toMatchSnapshot();

    const trueWrapper = shallow(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
        showDescription={true}
        isValid={true}
      />
    );
    expect(trueWrapper).toMatchSnapshot();
  });

  it('allows specifying custom save button label', () => {
    const wrapper = mountWithIntl(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
        showDescription={true}
        confirmButtonLabel="Save and done"
      />
    );
    expect(wrapper.find('button[data-test-subj="confirmSaveSavedObjectButton"]').text()).toBe(
      'Save and done'
    );
  });
});
