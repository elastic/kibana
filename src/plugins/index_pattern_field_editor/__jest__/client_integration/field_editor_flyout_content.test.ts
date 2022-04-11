/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';

import type { Props } from '../../public/components/field_editor_flyout_content';
import { setupEnvironment } from './helpers';
import { setup } from './field_editor_flyout_content.helpers';

describe('<FieldEditorFlyoutContent />', () => {
  const { httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['foo'] });
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should have the correct title', async () => {
    const { exists, find } = await setup();
    expect(exists('flyoutTitle')).toBe(true);
    expect(find('flyoutTitle').text()).toBe('Create field');
  });

  test('should allow a field to be provided', async () => {
    const field = {
      name: 'foo',
      type: 'ip',
      script: {
        source: 'emit("hello world")',
      },
    };

    const { find } = await setup({ field });

    expect(find('flyoutTitle').text()).toBe(`Edit field 'foo'`);
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

    const { find } = await setup({ onSave, field });

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

  test('should accept an onCancel prop', async () => {
    const onCancel = jest.fn();
    const { find } = await setup({ onCancel });

    find('closeFlyoutButton').simulate('click');

    expect(onCancel).toHaveBeenCalled();
  });

  describe('validation', () => {
    test('should validate the fields and prevent saving invalid form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const { find, exists, form, component } = await setup({ onSave });

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
        actions: { toggleFormRow, fields },
      } = await setup({ onSave });

      await fields.updateName('someName');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');

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
      await fields.updateType('other_type', 'Other type');

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
