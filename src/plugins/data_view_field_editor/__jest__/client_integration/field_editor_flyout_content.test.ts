/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';

// This import needs to come first as it contains the jest.mocks
import { setupEnvironment } from './helpers';
import type { Props } from '../../public/components/field_editor_flyout_content';
import { setSearchResponse } from './field_editor_flyout_preview.helpers';
import { setup } from './field_editor_flyout_content.helpers';
import { mockDocuments, createPreviewError } from './helpers/mocks';

describe('<FieldEditorFlyoutContent />', () => {
  const { httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    setSearchResponse(mockDocuments);
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['mockedScriptValue'] });
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

    const { find, actions } = await setup({ onSave, field });

    await act(async () => {
      find('fieldSaveButton').simulate('click');
    });

    await actions.waitForUpdates(); // Run the validations

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

      const {
        find,
        form,
        actions: { waitForUpdates },
      } = await setup({ onSave });

      expect(find('fieldSaveButton').props().disabled).toBe(false);

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      await waitForUpdates();

      expect(onSave).toHaveBeenCalledTimes(0);
      expect(find('fieldSaveButton').props().disabled).toBe(true);
      expect(form.getErrorsMessages()).toEqual(['A name is required.']);
    });

    test('should forward values from the form', async () => {
      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const {
        find,
        actions: { toggleFormRow, fields, waitForUpdates },
      } = await setup({ onSave });

      await fields.updateName('someName');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');

      await waitForUpdates();

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
      await fields.updateType('date');
      await waitForUpdates();

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'date',
        script: { source: 'echo("hello")' },
      });
    });

    test('should not block validation if no documents could be fetched from server', async () => {
      // If no documents can be fetched from the cluster (either because there are none or because
      // the request failed), we still need to be able to resolve the painless script validation.
      // In this test we will make sure that the validation for the script does not block saving the
      // field even when no documentes where returned from the search query.
      // successfully even though the script is invalid.
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });
      setSearchResponse([]);

      const onSave: jest.Mock<Props['onSave']> = jest.fn();

      const {
        find,
        actions: { toggleFormRow, fields, waitForUpdates },
      } = await setup({ onSave });

      await fields.updateName('someName');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');

      await waitForUpdates(); // Wait for validation... it should not block and wait for preview response

      await act(async () => {
        find('fieldSaveButton').simulate('click');
      });

      expect(onSave).toBeCalled();
      const fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'keyword',
        script: { source: 'echo("hello")' },
      });
    });
  });
});
