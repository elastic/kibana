/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';

// This import needs to come first as it contains the jest.mocks
import { setupEnvironment, mockDocuments } from './helpers';
import { FieldEditorFormState, Props } from '../../public/components/field_editor/field_editor';
import type { Field } from '../../public/types';
import { setSearchResponse } from './field_editor_flyout_preview.helpers';
import {
  setup,
  FieldEditorTestBed,
  waitForDocumentsAndPreviewUpdate,
} from './field_editor.helpers';

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
      // We can't await for the promise here ("await state.submit()") as the validation for the
      // "script" field has different setTimeout mocked by jest.
      // If we await here (await state.submit()) we don't have the chance to call jest.advanceTimersByTime()
      // below and the test times out.
      promise = state.submit();
    });

    await waitForDocumentsAndPreviewUpdate();

    await act(async () => {
      promise.then((response) => {
        formState = response;
      });
    });

    if (formState === undefined) {
      throw new Error(
        `The form state is not defined, this probably means that the promise did not resolve due to an unresolved validation.`
      );
    }

    return formState;
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    onChange = jest.fn();
    setSearchResponse(mockDocuments);
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
      } catch (e: any) {
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
  });
});
