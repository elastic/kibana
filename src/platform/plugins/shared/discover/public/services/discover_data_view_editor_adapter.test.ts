/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { indexPatternEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { createDiscoverDataViewEditorAdapter } from './discover_data_view_editor_adapter';

// Builds a view without fetching fields; identity calculation is covered by the service tests.
const createDataView = (spec: DataViewSpec): DataView =>
  new DataView({ spec, fieldFormats: fieldFormatsMock });

// Captures the shared editor boundary without mounting a flyout.
const setup = () => {
  const dataViewEditor = indexPatternEditorPluginMock.createStartContract();
  const close = jest.fn();
  dataViewEditor.openEditor.mockReturnValue(close);
  const dataViews = { clearInstanceCache: jest.fn() };
  const inlineDataViews = { resolve: jest.fn(), finalize: jest.fn() };
  const editor = createDiscoverDataViewEditorAdapter({
    dataViewEditor,
    dataViews,
    inlineDataViews,
  });

  return { editor, dataViewEditor, dataViews, inlineDataViews, close };
};

describe('createDiscoverDataViewEditorAdapter', () => {
  it.each(['create', 'duplicate', 'managed copy'])(
    'finalizes %s and releases the returned draft before notifying Discover',
    async (mode) => {
      const { editor, dataViewEditor, dataViews, inlineDataViews, close } = setup();
      const draft = createDataView({ id: 'draft', title: 'logs-*' });
      const finalized = createDataView({ id: 'derived-id', title: 'logs-*' });
      inlineDataViews.finalize.mockResolvedValue(finalized);
      const onSave = jest.fn();
      const onCancel = jest.fn();
      const editData =
        mode === 'create'
          ? undefined
          : createDataView({
              id: 'picker-copy',
              title: 'logs-*',
              managed: mode === 'managed copy',
            });
      const options = { onSave, onCancel, editData, isDuplicating: mode === 'duplicate' };

      expect(editor.openEditor(options)).toBe(close);
      const [forwarded] = dataViewEditor.openEditor.mock.calls[0];
      expect(forwarded).toEqual({ ...options, onSave: expect.any(Function) });
      const saving = forwarded.onSave(draft);
      expect(onSave).not.toHaveBeenCalled();
      await saving;

      expect(inlineDataViews.finalize).toHaveBeenCalledWith(draft);
      expect(onSave).toHaveBeenCalledWith(finalized);
      expect(dataViews.clearInstanceCache.mock.calls).toEqual([['draft']]);
      expect(dataViews.clearInstanceCache.mock.invocationCallOrder[0]).toBeLessThan(
        onSave.mock.invocationCallOrder[0]
      );
    }
  );

  it('delegates existing-view editing and other editor capabilities unchanged', () => {
    const { editor, dataViewEditor, close } = setup();
    const options = {
      editData: createDataView({ id: 'shared', title: 'logs-*' }),
      onSave: jest.fn(),
    };

    expect(editor.openEditor(options)).toBe(close);
    expect(dataViewEditor.openEditor.mock.calls[0][0]).toBe(options);
    expect(editor.userPermissions).toBe(dataViewEditor.userPermissions);
    expect(editor.IndexPatternEditorComponent).toBe(dataViewEditor.IndexPatternEditorComponent);
  });

  it.each([true, false])('keeps an unchanged view cached (persisted: %s)', async (persisted) => {
    const { editor, dataViewEditor, dataViews, inlineDataViews } = setup();
    const view = createDataView({
      id: 'unchanged',
      title: 'logs-*',
      version: persisted ? '1' : undefined,
    });
    inlineDataViews.finalize.mockResolvedValue(view);
    const onSave = jest.fn();
    editor.openEditor({ onSave });

    await dataViewEditor.openEditor.mock.calls[0][0].onSave(view);

    expect(inlineDataViews.finalize).toHaveBeenCalledTimes(persisted ? 0 : 1);
    expect(onSave).toHaveBeenCalledWith(view);
    expect(dataViews.clearInstanceCache).not.toHaveBeenCalled();
  });
});
