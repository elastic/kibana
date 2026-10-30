/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from './use_discover_services';
import { useCurrentTabSelector } from '../application/main/state_management/redux';
import {
  createInlineDataViewEditorController,
  type InlineDataViewEditPhase,
} from '../utils/inline_data_view_editor_controller';

interface FieldEditResult {
  editedDataView: DataView;
  editedFieldName?: string;
  removedFieldName?: string;
}

type FieldEditAction = { type: 'edit'; fieldName?: string } | { type: 'delete'; fieldName: string };

interface FieldEditorActions {
  editField: (fieldName?: string) => void;
  deleteField: (fieldName: string) => void;
}

const getFieldEditorErrorTitle = (phase: InlineDataViewEditPhase) => {
  if (phase === 'open') {
    return i18n.translate('discover.fieldEditor.openErrorTitle', {
      defaultMessage: 'Unable to open field editor',
    });
  }

  return i18n.translate('discover.fieldEditor.commitErrorTitle', {
    defaultMessage: 'Unable to apply field changes',
  });
};

/** Opens field edits on owned sessions and cancels them when their view or tab leaves the UI. */
export const useDataViewFieldEditor = ({
  dataView,
  onFieldEdited,
}: {
  dataView: DataView | undefined;
  onFieldEdited?: (result: FieldEditResult) => void | Promise<void>;
}): FieldEditorActions => {
  const { inlineDataViews, dataViewFieldEditor, toastNotifications } = useDiscoverServices();
  const tabId = useCurrentTabSelector((tab) => tab.id);
  const controller = useMemo(() => createInlineDataViewEditorController(), []);

  useEffect(() => {
    // Close the current edit on unmount or when its view or tab changes.
    return () => controller.dispose();
  }, [controller, dataView?.id, tabId]);

  const open = useCallback(
    (action: FieldEditAction) => {
      if (!dataView || !onFieldEdited) {
        return;
      }

      controller.open({
        session: inlineDataViews.beginEdit(dataView),
        onError: (error, phase) => {
          toastNotifications.addError(error, { title: getFieldEditorErrorTitle(phase) });
        },
        openEditor: (draft, { commit, cancel }) => {
          if (action.type === 'delete') {
            const applyFieldDeletion = (editedDataView: DataView) =>
              onFieldEdited({ editedDataView, removedFieldName: action.fieldName });
            const onDelete = () => commit(applyFieldDeletion);

            return dataViewFieldEditor.openDeleteModal({
              ctx: { dataView: draft },
              fieldName: action.fieldName,
              onCancel: cancel,
              onDelete,
            });
          }

          const applyFieldEdit = (editedDataView: DataView) =>
            onFieldEdited({ editedDataView, editedFieldName: action.fieldName });
          const onSave = (fields: DataViewField[]) => {
            const updatedFieldNames = fields.map(({ name }) => name);

            return commit(applyFieldEdit, { updatedFieldNames });
          };

          return dataViewFieldEditor.openEditor({
            ctx: { dataView: draft },
            fieldName: action.fieldName,
            onCancel: cancel,
            onSave,
          });
        },
      });
    },
    [controller, dataView, onFieldEdited, inlineDataViews, dataViewFieldEditor, toastNotifications]
  );

  const editField = useCallback((fieldName?: string) => open({ type: 'edit', fieldName }), [open]);
  const deleteField = useCallback(
    (fieldName: string) => open({ type: 'delete', fieldName }),
    [open]
  );

  return { editField, deleteField };
};
