/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useMemo } from 'react';
import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed } from '@kbn/test/jest';

// This import needs to come first as it contains the jest.mocks
import { setupEnvironment, getCommonActions, WithFieldEditorDependencies } from './helpers';
import {
  FieldEditor,
  FieldEditorFormState,
  Props,
} from '../../public/components/field_editor/field_editor';
import type { Field } from '../../public/types';
import type { RuntimeFieldPainlessError } from '../../public/lib';
import { setup, FieldEditorTestBed, defaultProps } from './field_editor.helpers';

describe('<FieldEditor />', () => {
  const { httpRequestsMockHelpers } = setupEnvironment();

  let testBed: FieldEditorTestBed;
  let onChange: jest.Mock<Props['onChange']> = jest.fn();

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

    let promise: ReturnType<FieldEditorFormState['submit']>;

    await act(async () => {
      // We can't await for the promise here as the validation for the
      // "script" field has a setTimeout which is mocked by jest. If we await
      // we don't have the chance to call jest.advanceTimersByTime and thus the
      // test times out.
      promise = state.submit();
    });

    await act(async () => {
      // The painless syntax validation has a timeout set to 600ms
      // we give it a bit more time just to be on the safe side
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      promise.then((response) => {
        formState = response;
      });
    });

    return formState!;
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onChange = jest.fn();
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['mockedScriptValue'] });
  });

  test('initial state should have "set custom label", "set value" and "set format" turned off', async () => {
    testBed = await setup();

    ['customLabel', 'value', 'format'].forEach((row) => {
      const testSubj = `${row}Row.toggle`;
      const toggle = testBed.find(testSubj);
      const isOn = toggle.props()['aria-checked'];

      try {
        expect(isOn).toBe(false);
      } catch (e) {
        e.message = `"${row}" row toggle expected to be 'off' but was 'on'. \n${e.message}`;
        throw e;
      }
    });
  });

  test('should accept a defaultValue and onChange prop to forward the form state', async () => {
    const field = {
      name: 'foo',
      type: 'date',
      script: { source: 'emit("hello")' },
    };

    testBed = await setup({ onChange, field });

    expect(onChange).toHaveBeenCalled();

    let lastState = getLastStateUpdate();
    expect(lastState.isValid).toBe(undefined);
    expect(lastState.isSubmitted).toBe(false);
    expect(lastState.submit).toBeDefined();

    const { data: formData } = await submitFormAndGetData(lastState);
    expect(formData).toEqual(field);

    // Make sure that both isValid and isSubmitted state are now "true"
    lastState = getLastStateUpdate();
    expect(lastState.isValid).toBe(true);
    expect(lastState.isSubmitted).toBe(true);
  });

  describe('validation', () => {
    test('should accept an optional list of existing fields and prevent creating duplicates', async () => {
      const existingFields = ['myRuntimeField'];
      testBed = await setup(
        {
          onChange,
        },
        {
          namesNotAllowed: existingFields,
          existingConcreteFields: [],
          fieldTypeToProcess: 'runtime',
        }
      );

      const { form, component, actions } = testBed;

      await actions.toggleFormRow('value');
      await actions.fields.updateName(existingFields[0]);
      await actions.fields.updateScript('echo("hello")');

      await act(async () => {
        jest.advanceTimersByTime(1000); // Make sure our debounced error message is in the DOM
      });

      const lastState = getLastStateUpdate();
      await submitFormAndGetData(lastState);
      component.update();
      expect(getLastStateUpdate().isValid).toBe(false);
      expect(form.getErrorsMessages()).toEqual(['A field with this name already exists.']);
    });

    test('should not count the default value as a duplicate', async () => {
      const existingRuntimeFieldNames = ['myRuntimeField'];
      const field: Field = {
        name: 'myRuntimeField',
        type: 'boolean',
        script: { source: 'emit("hello"' },
      };

      testBed = await setup(
        {
          field,
          onChange,
        },
        {
          namesNotAllowed: existingRuntimeFieldNames,
          existingConcreteFields: [],
          fieldTypeToProcess: 'runtime',
        }
      );

      const { form, component } = testBed;
      const lastState = getLastStateUpdate();
      await submitFormAndGetData(lastState);
      component.update();

      expect(getLastStateUpdate().isValid).toBe(true);
      expect(form.getErrorsMessages()).toEqual([]);
    });

    test('should clear the painless syntax error whenever the field type changes', async () => {
      const field: Field = {
        name: 'myRuntimeField',
        type: 'keyword',
        script: { source: 'emit(6)' },
      };

      const dummyError = {
        reason: 'Awwww! Painless syntax error',
        message: '',
        position: { offset: 0, start: 0, end: 0 },
        scriptStack: [''],
      };

      const ComponentToProvidePainlessSyntaxErrors = () => {
        const [error, setError] = useState<RuntimeFieldPainlessError | null>(null);
        const clearError = useMemo(() => () => setError(null), []);
        const syntaxError = useMemo(() => ({ error, clear: clearError }), [error, clearError]);

        return (
          <>
            <FieldEditor {...defaultProps} field={field} syntaxError={syntaxError} />

            {/* Button to forward dummy syntax error */}
            <button onClick={() => setError(dummyError)} data-test-subj="setPainlessErrorButton">
              Set painless error
            </button>
          </>
        );
      };

      let testBedToCapturePainlessErrors: TestBed<string>;

      await act(async () => {
        testBedToCapturePainlessErrors = await registerTestBed(
          WithFieldEditorDependencies(ComponentToProvidePainlessSyntaxErrors),
          {
            memoryRouter: {
              wrapComponent: false,
            },
          }
        )();
      });

      testBed = {
        ...testBedToCapturePainlessErrors!,
        actions: getCommonActions(testBedToCapturePainlessErrors!),
      };

      const {
        form,
        component,
        find,
        actions: { fields },
      } = testBed;

      // We set some dummy painless error
      act(() => {
        find('setPainlessErrorButton').simulate('click');
      });
      component.update();

      expect(form.getErrorsMessages()).toEqual(['Awwww! Painless syntax error']);

      // We change the type and expect the form error to not be there anymore
      await fields.updateType('keyword');
      expect(form.getErrorsMessages()).toEqual([]);
    });
  });
});
