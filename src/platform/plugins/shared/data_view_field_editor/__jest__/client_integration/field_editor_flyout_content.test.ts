/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This import needs to come first as it contains the jest.mocks
import { createPreviewError, mockDocuments } from './helpers/mocks';
import { setupEnvironment } from './helpers';
import { screen, waitFor } from '@testing-library/react';
import { setSearchResponse } from './field_editor_flyout_preview.helpers';
import { setup } from './field_editor_flyout_content.helpers';

describe('<FieldEditorFlyoutContent />', () => {
  const { httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    setSearchResponse(mockDocuments);
    httpRequestsMockHelpers.setFieldPreviewResponse({ values: ['mockedScriptValue'] });
  });

  it('should have the correct title', async () => {
    await setup();

    expect(screen.getByText('Create field')).toBeVisible();
  });

  it('should allow an existing field to be provided', async () => {
    const field = {
      name: 'foo',
      type: 'ip' as const,
      script: {
        source: 'emit("hello world")',
      },
    };

    const {
      actions: { getByTestSubjectPath },
    } = await setup({ fieldToEdit: field });

    expect(screen.getByText(`Edit field 'foo'`)).toBeVisible();
    expect(getByTestSubjectPath('nameField.input')).toHaveValue(field.name);
    expect(getByTestSubjectPath('typeField')).toHaveValue(field.type);
    expect(getByTestSubjectPath('scriptField')).toHaveValue(field.script.source);
  });

  it('should allow a new field to be created with initial configuration', async () => {
    const fieldToCreate = {
      name: 'demotestfield',
      type: 'boolean' as const,
      script: { source: 'emit(true)' },
      customLabel: 'cool demo test field',
      format: { id: 'boolean' },
      popularity: 1,
    };

    const {
      actions: { getByTestSubjectPath },
    } = await setup({ fieldToCreate });

    expect(screen.getByText(`Create field`)).toBeVisible();
    expect(getByTestSubjectPath('nameField.input')).toHaveValue(fieldToCreate.name);
    expect(getByTestSubjectPath('typeField')).toHaveValue(fieldToCreate.type);
    expect(getByTestSubjectPath('scriptField')).toHaveValue(fieldToCreate.script.source);
    expect(getByTestSubjectPath('editorFieldCount')).toHaveValue(fieldToCreate.popularity);
  });

  it('should accept an "onSave" prop', async () => {
    const field = {
      name: 'foo',
      type: 'date' as const,
      script: { source: 'test=123' },
    };
    const onSave = jest.fn();

    const {
      actions: { saveField },
    } = await setup({ onSave, fieldToEdit: field });

    await saveField();

    await waitFor(() => expect(onSave).toHaveBeenCalled());

    expect(onSave).toHaveBeenCalled();
    const fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];
    expect(fieldReturned).toEqual({ ...field, format: null });
  });

  it('should accept an onCancel prop', async () => {
    const onCancel = jest.fn();
    const {
      actions: { closeFlyout },
    } = await setup({ onCancel });

    await closeFlyout();

    expect(onCancel).toHaveBeenCalled();
  });

  describe('validation', () => {
    it('should validate the fields and prevent saving invalid form', async () => {
      const onSave = jest.fn();

      const {
        actions: { saveField },
      } = await setup({ onSave });

      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();

      await saveField();

      await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled());

      expect(onSave).toHaveBeenCalledTimes(0);
      expect(screen.getAllByText('A name is required.')).toHaveLength(2);
    });

    it('should forward default values from the form', async () => {
      const onSave = jest.fn();

      const {
        actions: { fields, saveField, toggleFormRow, waitForUpdates },
      } = await setup({ onSave });

      await fields.updateName('someName');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');

      await waitForUpdates();
      await saveField();

      expect(onSave).toHaveBeenCalledTimes(1);

      const fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        script: { source: 'echo("hello")' },
        type: 'keyword', // default to keyword
        format: null,
      });
    });

    it('should forward updated type and popularity from the form', async () => {
      const onSave = jest.fn();
      const fieldToCreate = {
        name: 'someName',
        type: 'keyword' as const,
        script: { source: 'echo("hello")' },
      };

      const {
        actions: { fields, saveField, toggleFormRow },
      } = await setup({ fieldToCreate, onSave });

      await fields.updateType('date');

      await saveField();

      expect(onSave).toHaveBeenCalledTimes(1);

      let fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        ...fieldToCreate,
        type: 'date',
        format: null,
      });

      await toggleFormRow('popularity');
      await fields.updatePopularity('5');

      await saveField();

      expect(onSave).toHaveBeenCalledTimes(2);

      fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        ...fieldToCreate,
        type: 'date',
        format: null,
        popularity: 5,
      });
    });

    it('should not block validation if no documents could be fetched from server', async () => {
      // If no documents can be fetched from the cluster (either because there are none or because
      // the request failed), we still need to be able to resolve the painless script validation.
      // In this test we will make sure that the validation for the script does not block saving the
      // field even when no documentes where returned from the search query.
      // successfully even though the script is invalid.
      const error = createPreviewError({ reason: 'Houston we got a problem' });
      httpRequestsMockHelpers.setFieldPreviewResponse({ values: [], error, status: 400 });
      setSearchResponse([]);

      const onSave = jest.fn();

      const {
        actions: { fields, saveField, toggleFormRow, waitForUpdates },
      } = await setup({ onSave });

      await fields.updateName('someName');
      await toggleFormRow('value');
      await fields.updateScript('echo("hello")');

      await waitForUpdates(); // Wait for validation... it should not block and wait for preview response

      await saveField();

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      const fieldReturned = onSave.mock.calls[onSave.mock.calls.length - 1][0];

      expect(fieldReturned).toEqual({
        name: 'someName',
        type: 'keyword',
        script: { source: 'echo("hello")' },
        format: null,
      });
    });
  });
});
