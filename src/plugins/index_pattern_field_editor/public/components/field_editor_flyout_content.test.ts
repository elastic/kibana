/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';

import '../test_utils/setup_environment';
import { registerTestBed, TestBed, noop, docLinks, getCommonActions } from '../test_utils';

import { FieldEditor } from './field_editor';
import { FieldEditorFlyoutContent, Props } from './field_editor_flyout_content';

const defaultProps: Props = {
  onSave: noop,
  onCancel: noop,
  docLinks,
  FieldEditor,
  indexPattern: { fields: [] } as any,
  uiSettings: {} as any,
  fieldFormats: {} as any,
  fieldFormatEditors: {} as any,
  fieldTypeToProcess: 'runtime',
  runtimeFieldValidator: () => Promise.resolve(null),
  isSavingField: false,
};

const setup = (props: Props = defaultProps) => {
  const testBed = registerTestBed(FieldEditorFlyoutContent, {
    memoryRouter: { wrapComponent: false },
  })(props) as TestBed;

  const actions = {
    ...getCommonActions(testBed),
  };

  return {
    ...testBed,
    actions,
  };
};

describe('<FieldEditorFlyoutContent />', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should have the correct title', () => {
    const { exists, find } = setup();
    expect(exists('flyoutTitle')).toBe(true);
    expect(find('flyoutTitle').text()).toBe('Create field');
  });

  test('should allow a field to be provided', () => {
    const field = {
      name: 'foo',
      type: 'ip',
      script: {
        source: 'emit("hello world")',
      },
    };

    const { find } = setup({ ...defaultProps, field });

    expect(find('flyoutTitle').text()).toBe(`Edit ${field.name} field`);
    expect(find('nameField.input').props().value).toBe(field.name);
    expect(find('typeField').props().value).toBe(field.type);
    expect(find('scriptField').props().value).toBe(field.script.source);
  });

  test('should accept an "onSave" prop', async () => {
    const field = {
      name: 'foo',
      type: 'date',
      script: { source: 'test=123' },
    };
    const onSave: jest.Mock<Props['onSave']> = jest.fn();

    const { find } = setup({ ...defaultProps, onSave, field });

    await act(async () => {
      find('fieldSaveButton').simulate('click');
    });

    await act(async () => {
      // The painless syntax validation has a timeout set to 600ms
      // we give it a bit more time just to be on the safe side
      jest.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalled();
    const fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    expect(fieldReturned).toEqual(field);
  });

  test('should accept an onCancel prop', () => {
    const onCancel = jest.fn();
    const { find } = setup({ ...defaultProps, onCancel });

    find('closeFlyoutButton').simulate('click');

    expect(onCancel).toHaveBeenCalled();
  });

  describe('validation', () => {
    test('should validate the fields and prevent saving invalid form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const { find, exists, form, component } = setup({ ...defaultProps, onSave });

      expect(find('fieldSaveButton').props().disabled).toBe(false);

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      component.update();

      expect(onSave).toHaveBeenCalledTimes(0);
      expect(find('fieldSaveButton').props().disabled).toBe(true);
      expect(form.getErrorsMessages()).toEqual(['A name is required.']);
      expect(exists('formError')).toBe(true);
      expect(find('formError').text()).toBe('Fix errors in form before continuing.');
    });

    test('should forward values from the form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const {
        find,
        component,
        form,
        actions: { toggleFormRow },
      } = setup({ ...defaultProps, onSave });

      act(() => {
        form.setInputValue('nameField.input', 'someName');
        toggleFormRow('value');
      });
      component.update();

      await act(async () => {
        form.setInputValue('scriptField', 'echo("hello")');
      });

      await act(async () => {
        // Let's make sure that validation has finished running
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      expect(onSave).toHaveBeenCalled();

      let fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'keyword', // default to keyword
        script: { source: 'echo("hello")' },
      });

      // Change the type and make sure it is forwarded
      act(() => {
        find('typeField').simulate('change', [
          {
            label: 'Other type',
            value: 'other_type',
          },
        ]);
      });

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'other_type',
        script: { source: 'echo("hello")' },
      });
    });
  });
});
