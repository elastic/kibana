/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { SavedObjectSaveModal } from './saved_object_save_modal';

import { mountWithIntl } from '@kbn/test-jest-helpers';

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
