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

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    const confirmButtonLabel = 'Save and done';

    render(
      <SavedObjectSaveModal
        onSave={() => void 0}
        onClose={() => void 0}
        title={'Saved Object title'}
        showCopyOnSave={false}
        objectType="visualization"
        showDescription={true}
        confirmButtonLabel={confirmButtonLabel}
      />
    );

    expect(screen.queryByText(confirmButtonLabel)).toBeInTheDocument();
  });

  it('enforces copy on save', async () => {
    const onSave = jest.fn();

    render(
      <SavedObjectSaveModal
        onSave={onSave}
        onClose={() => void 0}
        title={'Saved Object title'}
        objectType="visualization"
        showDescription={true}
        showCopyOnSave={true}
        mustCopyOnSaveMessage="You must save a copy of the object."
      />
    );

    expect(onSave).not.toHaveBeenCalled();

    expect(screen.getByTestId('saveAsNewCheckbox')).toBeDisabled();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0][0].newCopyOnSave).toBe(true);
    });
  });
});
