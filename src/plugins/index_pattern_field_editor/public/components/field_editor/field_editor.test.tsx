/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';

import '../../test_utils/setup_environment';
import { registerTestBed, TestBed, getCommonActions } from '../../test_utils';
import { Field } from '../../types';
import { FieldEditor, Props, FieldEditorFormState } from './field_editor';

const defaultProps: Props = {
  onChange: jest.fn(),
  links: {
    runtimePainless: 'https://elastic.co',
  },
  ctx: {
    existingConcreteFields: [],
    namesNotAllowed: [],
    fieldTypeToProcess: 'runtime',
  },
  indexPattern: { fields: [] } as any,
  fieldFormatEditors: {
    getAll: () => [],
    getById: () => undefined,
  },
  fieldFormats: {} as any,
  uiSettings: {} as any,
  syntaxError: {
    error: null,
    clear: () => {},
  },
};

const setup = (props?: Partial<Props>) => {
  const testBed = registerTestBed(FieldEditor, {
    memoryRouter: {
      wrapComponent: false,
    },
  })({ ...defaultProps, ...props }) as TestBed;

  const actions = {
    ...getCommonActions(testBed),
  };

  return {
    ...testBed,
    actions,
  };
};

describe('<FieldEditor />', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  let testBed: TestBed & { actions: ReturnType<typeof getCommonActions> };
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

  beforeEach(() => {
    onChange = jest.fn();
  });

  test('initial state should have "set custom label", "set value" and "set format" turned off', () => {
    testBed = setup();

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

    testBed = setup({ onChange, field });

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
      testBed = setup({
        onChange,
        ctx: {
          namesNotAllowed: existingFields,
          existingConcreteFields: [],
          fieldTypeToProcess: 'runtime',
        },
      });

      const { form, component, actions } = testBed;

      await act(async () => {
        actions.toggleFormRow('value');
      });

      await act(async () => {
        form.setInputValue('nameField.input', existingFields[0]);
        form.setInputValue('scriptField', 'echo("hello")');
      });

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

      testBed = setup({
        field,
        onChange,
        ctx: {
          namesNotAllowed: existingRuntimeFieldNames,
          existingConcreteFields: [],
          fieldTypeToProcess: 'runtime',
        },
      });

      const { form, component } = testBed;
      const lastState = getLastStateUpdate();
      await submitFormAndGetData(lastState);
      component.update();
      expect(getLastStateUpdate().isValid).toBe(true);
      expect(form.getErrorsMessages()).toEqual([]);
    });
  });
});
