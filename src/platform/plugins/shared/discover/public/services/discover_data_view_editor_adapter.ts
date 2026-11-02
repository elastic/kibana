/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewEditorProps, DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isInlineDataView } from '../../common/session/inline_data_view';
import {
  createInlineDataViewEditorController,
  type InlineDataViewEditPhase,
} from '../utils/inline_data_view_editor_controller';
import type { InlineDataViewService } from './inline_data_view_service';

/** Isolates inline edits and finalizes views before handing them back to Discover. */
export const createDiscoverDataViewEditorAdapter = ({
  dataViewEditor,
  inlineDataViews,
  onEditError,
}: {
  dataViewEditor: DataViewEditorStart;
  inlineDataViews: InlineDataViewService;
  onEditError: (error: Error, phase: InlineDataViewEditPhase) => void;
}): DataViewEditorStart => {
  const controller = createInlineDataViewEditorController();

  // The editor changes the view in place, so it edits a draft instead of the shared instance.
  const openInlineEdit = (options: DataViewEditorProps, editData: DataView) =>
    controller.open({
      session: inlineDataViews.beginEdit(editData),
      onError: onEditError,
      openEditor: (draft, { commit, cancel }) => {
        const onSave = () => commit(options.onSave);
        const onCancel = () => {
          cancel();
          options.onCancel?.();
        };

        return dataViewEditor.openEditor({
          ...options,
          editData: draft,
          onSave,
          onCancel,
        });
      },
    });

  // Created and copied views get the identity of their final spec.
  const openCreation = (options: DataViewEditorProps) => {
    const onSaveInlineDataView = async (createdDataView: DataView) => {
      // The editor rejects custom IDs for inline creation, so this instance is owned here.
      const finalizedDataView = await inlineDataViews.completeCreation(createdDataView);
      return options.onSave(finalizedDataView);
    };

    // Saved views keep the synchronous callback, so the editor still reports their errors.
    const onSave = (createdDataView: DataView) => {
      if (createdDataView.isPersisted()) {
        return options.onSave(createdDataView);
      }

      return onSaveInlineDataView(createdDataView);
    };

    return dataViewEditor.openEditor({ ...options, onSave });
  };

  return {
    ...dataViewEditor,
    openEditor: (options) => {
      const { editData, isDuplicating } = options;

      if (editData && !isDuplicating && isInlineDataView(editData)) {
        return openInlineEdit(options, editData);
      }

      controller.dispose();
      // Managed views can only be copied.
      if (!editData || isDuplicating || editData.managed) {
        return openCreation(options);
      }

      return dataViewEditor.openEditor(options);
    },
  };
};
