/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';

import { Form } from './form';
import { wrap, settingsMock } from './mocks';
import { TEST_SUBJ_PREFIX_FIELD } from '@kbn/management-settings-components-field-input/input';
import { DATA_TEST_SUBJ_SAVE_BUTTON, DATA_TEST_SUBJ_CANCEL_BUTTON } from './bottom_bar';
import { FormServices } from './types';

const fields: Array<FieldDefinition<SettingType>> = Object.entries(settingsMock).map(
  ([id, setting]) =>
    getFieldDefinition({
      id,
      setting,
      params: { isCustom: false, isOverridden: setting.isOverridden },
    })
);

const services: FormServices = {
  showDanger: jest.fn(),
  links: {},
  saveChanges: jest.fn(),
  showError: jest.fn(),
  showReloadPagePrompt: jest.fn(),
};

describe('Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    const { container } = render(wrap(<Form fields={fields} isSavingEnabled={true} />));

    expect(container).toBeInTheDocument();
  });

  it('renders as read only if saving is disabled', () => {
    const { getByTestId } = render(wrap(<Form fields={fields} isSavingEnabled={false} />));

    (Object.keys(settingsMock) as SettingType[]).forEach((type) => {
      if (type === 'json' || type === 'markdown') {
        return;
      }

      const inputTestSubj = `${TEST_SUBJ_PREFIX_FIELD}-${type}`;

      if (type === 'color') {
        expect(getByTestId(`euiColorPickerAnchor ${inputTestSubj}`)).toBeDisabled();
      } else {
        expect(getByTestId(inputTestSubj)).toBeDisabled();
      }
    });
  });

  it('renders bottom bar when a field is changed', () => {
    const { getByTestId, queryByTestId } = render(
      wrap(<Form fields={fields} isSavingEnabled={true} />)
    );

    expect(queryByTestId(DATA_TEST_SUBJ_SAVE_BUTTON)).not.toBeInTheDocument();
    expect(queryByTestId(DATA_TEST_SUBJ_CANCEL_BUTTON)).not.toBeInTheDocument();

    const testFieldType = 'string';
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${testFieldType}`);
    fireEvent.change(input, { target: { value: 'test' } });

    expect(getByTestId(DATA_TEST_SUBJ_SAVE_BUTTON)).toBeInTheDocument();
    expect(getByTestId(DATA_TEST_SUBJ_CANCEL_BUTTON)).toBeInTheDocument();
  });

  // TODO: fix
  it.skip('fires saveChanges when Save button is clicked', () => {
    const { getByTestId } = render(wrap(<Form fields={fields} isSavingEnabled={true} />, services));

    const testFieldType = 'string';
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${testFieldType}`);
    fireEvent.change(input, { target: { value: 'test' } });

    const saveButton = getByTestId(DATA_TEST_SUBJ_SAVE_BUTTON);
    fireEvent.click(saveButton);

    expect(services.saveChanges).toHaveBeenCalled();
  });

  it('clears changes when Cancel button is clicked', () => {
    const { getByTestId } = render(wrap(<Form fields={fields} isSavingEnabled={false} />));

    const testFieldType = 'string';
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${testFieldType}`);
    fireEvent.change(input, { target: { value: 'test' } });

    const cancelButton = getByTestId(DATA_TEST_SUBJ_CANCEL_BUTTON);
    fireEvent.click(cancelButton);

    expect(input).toHaveValue(settingsMock[testFieldType].value);
  });

  // TODO: fix
  it.skip('fires showError when saving is unsuccessful', () => {
    const saveChangesWithError = jest.fn(() => {
      throw new Error('Unable to save');
    });
    const testServices = { ...services, saveChanges: saveChangesWithError };

    const { getByTestId } = render(
      wrap(<Form fields={fields} isSavingEnabled={true} />, testServices)
    );

    const testFieldType = 'string';
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${testFieldType}`);
    fireEvent.change(input, { target: { value: 'test' } });

    const saveButton = getByTestId(DATA_TEST_SUBJ_SAVE_BUTTON);
    fireEvent.click(saveButton);

    expect(services.showError).toHaveBeenCalled();
  });

  // TODO: fix
  it.skip('fires showReloadPagePrompt when changing a reloadPageRequired setting', () => {
    // Make all settings require a page reload
    const testFields = fields.map((field) => {
      return { ...field, requiresPageReload: true };
    });

    const { getByTestId } = render(
      wrap(<Form fields={testFields} isSavingEnabled={true} />, services)
    );

    const testFieldType = 'string';
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${testFieldType}`);
    fireEvent.change(input, { target: { value: 'test' } });

    const saveButton = getByTestId(DATA_TEST_SUBJ_SAVE_BUTTON);
    fireEvent.click(saveButton);

    expect(services.showReloadPagePrompt).toHaveBeenCalled();
  });
});
