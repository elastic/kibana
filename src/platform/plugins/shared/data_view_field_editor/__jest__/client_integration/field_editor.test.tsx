/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Field } from '../../public/types';
import type { FieldEditorFormState } from '../../public/components/field_editor/field_editor';
import { act, screen } from '@testing-library/react';
// This import needs to come first as it contains the jest.mocks
import { setupEnvironment, mockDocuments } from './helpers';
import { flushDocumentsAndPreviewTimers } from './helpers/rtl_helpers';
import { setSearchResponse } from './field_editor_flyout_preview.helpers';
import { setup } from './field_editor.helpers';

describe('<FieldEditor />', () => {
  const { httpRequestsMockHelpers } = setupEnvironment();

  let onChange = jest.fn();

  const lastOnChangeCall = (): FieldEditorFormState[] =>
    onChange.mock.calls[onChange.mock.calls.length - 1];

  const getLastStateUpdate = () => lastOnChangeCall()[0];

  const submitFormAndGetData = async (state: FieldEditorFormState) => {
    let formState:
      | {
          data: Field;
          isValid: boolean;
        }
      | undefined;

    await act(async () => {
      // We can't await for the promise here ("await state.submit()") as the validation for the
      // "script" field has different setTimeout mocked by jest.
      // If we await here (await state.submit()) we don't have the chance to call jest.advanceTimersByTime()
      // below and the test times out.
      const promise = state.submit();
      await flushDocumentsAndPreviewTimers();
      formState = await promise;
    });

    if (formState === undefined) {
      throw new Error(
        `The form state is not defined, this probably means that the promise did not resolve due to an unresolved validation.`
      );
    }

    return formState;
  };

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onChange = jest.fn();
    setSearchResponse(mockDocuments);
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['mockedScriptValue'] });
  });

  it.each(['Set custom label', 'Set custom description', 'Set value', 'Set format'])(
    'initial state should have "%s" turned off',
    async (name) => {
      await setup();
      expect(screen.getByRole('switch', { name })).not.toBeChecked();
    }
  );

  it('should accept a defaultValue and onChange prop to forward the form state', async () => {
    const field = {
      name: 'foo',
      type: 'date' as const,
      script: { source: 'emit("hello")' },
    };

    await setup({ onChange, field });

    expect(onChange).toHaveBeenCalled();

    let lastState = getLastStateUpdate();
    expect(lastState.isValid).toBe(undefined);
    expect(lastState.isSubmitted).toBe(false);
    expect(lastState.submit).toBeDefined();

    const { data: formData } = await submitFormAndGetData(lastState);
    expect(formData).toEqual({ ...field, format: null });

    lastState = getLastStateUpdate();
    expect(lastState.isValid).toBe(true);
    expect(lastState.isSubmitted).toBe(true);
  });

  describe('validation', () => {
    it('should prevent creating duplicates', async () => {
      const existingFields = ['myRuntimeField'];
      const {
        actions: { toggleFormRow, fields },
      } = await setup(
        {
          onChange,
        },
        {
          fieldTypeToProcess: 'runtime',
        },
        // getByName returns a value, which means that the field already exists
        () => {
          return {
            name: 'myRuntimeField',
            type: 'boolean',
            script: { source: 'emit("hello")' },
          };
        }
      );

      await toggleFormRow('value');
      await fields.updateName(existingFields[0]);
      await fields.updateScript('echo("hello")');

      await act(async () => {
        jest.advanceTimersByTime(1000); // Make sure our debounced error message is in the DOM
      });

      const lastState = getLastStateUpdate();
      await submitFormAndGetData(lastState);
      expect(getLastStateUpdate().isValid).toBe(false);
      expect(screen.getAllByText('A field with this name already exists.')).toHaveLength(2);
    });

    it('should not count the default value as a duplicate', async () => {
      const field: Field = {
        name: 'myRuntimeField',
        type: 'boolean',
        script: { source: 'emit("hello"' },
      };

      await setup(
        {
          field,
          onChange,
        },
        {
          fieldTypeToProcess: 'runtime',
        }
      );

      const lastState = getLastStateUpdate();
      await submitFormAndGetData(lastState);

      expect(getLastStateUpdate().isValid).toBe(true);
      expect(screen.queryByText('A field with this name already exists.')).not.toBeInTheDocument();
    });
  });
});
