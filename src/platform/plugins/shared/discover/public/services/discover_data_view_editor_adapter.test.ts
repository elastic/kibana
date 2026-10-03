/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewEditorProps } from '@kbn/data-view-editor-plugin/public';
import { indexPatternEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { createDiscoverDataViewEditorAdapter } from './discover_data_view_editor_adapter';
import { createInlineDataViewEditSession } from './inline_data_view_edit_session';

// Builds a view without fetching fields; identity calculation is covered by the service tests.
const createDataView = (spec: DataViewSpec): DataView =>
  new DataView({ spec, fieldFormats: fieldFormatsMock });

// Captures the shared editor boundary without mounting a flyout.
const setup = () => {
  const dataViewEditor = indexPatternEditorPluginMock.createStartContract();
  const close = jest.fn();
  dataViewEditor.openEditor.mockReturnValue(close);
  const dataViews = dataViewPluginMocks.createStartContract();
  dataViews.create.mockImplementation(async (spec) => createDataView(spec));
  const finalize = jest.fn();
  const inlineDataViews = {
    create: jest.fn(),
    completeCreation: jest.fn(),
    resolve: jest.fn(),
    finalize,
    beginEdit: (source: DataView) =>
      createInlineDataViewEditSession({ source, dataViews, finalize }),
  };
  const onEditError = jest.fn();
  const editor = createDiscoverDataViewEditorAdapter({
    dataViewEditor,
    inlineDataViews,
    onEditError,
  });

  return { editor, dataViewEditor, dataViews, inlineDataViews, close, onEditError };
};

describe('createDiscoverDataViewEditorAdapter', () => {
  it.each<[string, Partial<DataViewEditorProps>]>([
    ['create', {}],
    [
      'duplicate',
      { editData: createDataView({ id: 'picker-copy', title: 'logs-*' }), isDuplicating: true },
    ],
    [
      'managed copy',
      { editData: createDataView({ id: 'picker-copy', title: 'logs-*', managed: true }) },
    ],
  ])('completes a %s through the service before notifying Discover', async (_mode, modeOptions) => {
    const { editor, dataViewEditor, inlineDataViews, close } = setup();
    const created = createDataView({ id: 'created', title: 'logs-*' });
    const finalized = createDataView({ id: 'derived-id', title: 'logs-*' });
    inlineDataViews.completeCreation.mockResolvedValue(finalized);
    const onSave = jest.fn();
    const options = { ...modeOptions, onSave, onCancel: jest.fn() };

    expect(editor.openEditor(options)).toBe(close);
    const [forwarded] = dataViewEditor.openEditor.mock.calls[0];
    expect(forwarded).toStrictEqual({ ...options, onSave: expect.any(Function) });
    await forwarded.onSave(created);

    expect(inlineDataViews.completeCreation).toHaveBeenCalledWith(created);
    expect(onSave).toHaveBeenCalledWith(finalized);
  });

  it.each<DataViewSpec>([
    { id: 'saved', title: 'logs-*', version: '1' },
    { id: 'esql', title: 'logs-*', type: ESQL_TYPE },
    { id: 'untitled' },
  ])('delegates persisted or excluded editing unchanged ($id)', (spec) => {
    const { editor, dataViewEditor, close } = setup();
    const options = {
      editData: createDataView(spec),
      onSave: jest.fn(),
    };

    expect(editor.openEditor(options)).toBe(close);
    expect(dataViewEditor.openEditor.mock.calls[0][0]).toBe(options);
    expect(editor.userPermissions).toBe(dataViewEditor.userPermissions);
    expect(editor.IndexPatternEditorComponent).toBe(dataViewEditor.IndexPatternEditorComponent);
  });

  describe('editing an inline view', () => {
    // Opens the editor on an inline view and returns the options it received for the draft.
    const openInlineEdit = async () => {
      const context = setup();
      const original = createDataView({ id: 'original', title: 'logs-*' });
      const onSave = jest.fn();
      const onCancel = jest.fn();
      context.editor.openEditor({ editData: original, onSave, onCancel });
      await waitFor(() => expect(context.dataViewEditor.openEditor).toHaveBeenCalled());
      const [options] = context.dataViewEditor.openEditor.mock.calls[0];
      const { editData: draft } = options;
      if (!draft) {
        throw new Error('The editor opened without a draft');
      }

      return { ...context, original, onSave, onCancel, options, draft };
    };

    it('forwards draft preparation failures to the UI without opening the editor', async () => {
      const { editor, dataViewEditor, dataViews, onEditError } = setup();
      const error = new Error('Draft preparation failed');
      dataViews.create.mockRejectedValueOnce(error);

      editor.openEditor({
        editData: createDataView({ id: 'original', title: 'logs-*' }),
        onSave: jest.fn(),
      });

      await waitFor(() => expect(onEditError).toHaveBeenCalledWith(error, 'open'));
      expect(dataViewEditor.openEditor).not.toHaveBeenCalled();
    });

    it('edits a draft and hands back the final identity', async () => {
      const { inlineDataViews, original, onSave, options, draft } = await openInlineEdit();
      const finalized = createDataView({ id: 'edited', title: 'other-*' });
      inlineDataViews.finalize.mockResolvedValue(finalized);

      draft.setIndexPattern('other-*');
      await options.onSave(draft);

      expect(draft).not.toBe(original);
      expect(inlineDataViews.finalize).toHaveBeenCalledWith(draft);
      expect(onSave).toHaveBeenCalledWith(finalized);
    });

    it('releases the draft when the edit is cancelled', async () => {
      const { dataViews, inlineDataViews, onSave, onCancel, options, draft } =
        await openInlineEdit();

      options.onCancel?.();

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(dataViews.clearInstanceCache.mock.calls).toEqual([[draft.id]]);
      expect(inlineDataViews.finalize).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it('passes a saved view to Discover as created', () => {
    const { editor, dataViewEditor, inlineDataViews } = setup();
    const saved = createDataView({ id: 'saved', title: 'logs-*', version: '1' });
    const onSave = jest.fn();
    editor.openEditor({ onSave });

    dataViewEditor.openEditor.mock.calls[0][0].onSave(saved);

    expect(inlineDataViews.completeCreation).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(saved);
  });
});
