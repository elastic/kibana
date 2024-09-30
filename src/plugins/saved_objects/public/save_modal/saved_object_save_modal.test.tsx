/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { SavedObjectSaveModal } from './saved_object_save_modal';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

describe('SavedObjectSaveModal', () => {
  it('should render matching snapshot', () => {
    const wrapper = shallowWithIntl(
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
    const wrapper = shallowWithIntl(
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
    const falseWrapper = shallowWithIntl(
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

    const trueWrapper = shallowWithIntl(
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
      <I18nProvider>
        <SavedObjectSaveModal
          onSave={() => void 0}
          onClose={() => void 0}
          title={'Saved Object title'}
          showCopyOnSave={false}
          objectType="visualization"
          showDescription={true}
          confirmButtonLabel={confirmButtonLabel}
        />
      </I18nProvider>
    );

    expect(screen.queryByText(confirmButtonLabel)).toBeInTheDocument();
  });

  it('enforces copy on save', async () => {
    const onSave = jest.fn();

    render(
      <I18nProvider>
        <SavedObjectSaveModal
          onSave={onSave}
          onClose={() => void 0}
          title={'Saved Object title'}
          objectType="visualization"
          showDescription={true}
          showCopyOnSave={true}
          mustCopyOnSaveMessage="You must save a copy of the object."
        />
      </I18nProvider>
    );

    expect(onSave).not.toHaveBeenCalled();

    expect(screen.getByTestId('saveAsNewCheckbox')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0][0].newCopyOnSave).toBe(true);
    });
  });
});
