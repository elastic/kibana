/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

type DeleteFieldFunc = (fieldName: string | string[]) => void;

export interface Props {
  children: (deleteFieldHandler: DeleteFieldFunc) => React.ReactNode;
  onConfirmDelete: (fieldsToDelete: string[]) => Promise<void>;
}

interface State {
  isModalOpen: boolean;
  fieldsToDelete: string[];
}

const geti18nTexts = (fieldsToDelete?: string[]) => {
  let modalTitle = '';
  if (fieldsToDelete) {
    const isSingle = fieldsToDelete.length === 1;

    modalTitle = isSingle
      ? i18n.translate(
          'indexPatternFieldEditor.deleteRuntimeField.confirmModal.deleteSingleTitle',
          {
            defaultMessage: `Remove field '{name}'?`,
            values: { name: fieldsToDelete[0] },
          }
        )
      : i18n.translate(
          'indexPatternFieldEditor.deleteRuntimeField.confirmModal.deleteMultipleTitle',
          {
            defaultMessage: `Remove {count} fields?`,
            values: { count: fieldsToDelete.length },
          }
        );
  }

  return {
    modalTitle,
    confirmButtonText: i18n.translate(
      'indexPatternFieldEditor.deleteRuntimeField.confirmationModal.removeButtonLabel',
      {
        defaultMessage: 'Remove',
      }
    ),
    cancelButtonText: i18n.translate(
      'indexPatternFieldEditor.deleteRuntimeField.confirmationModal.cancelButtonLabel',
      {
        defaultMessage: 'Cancel',
      }
    ),
    warningMultipleFields: i18n.translate(
      'indexPatternFieldEditor.deleteRuntimeField.confirmModal.multipleDeletionDescription',
      {
        defaultMessage: 'You are about to remove these runtime fields:',
      }
    ),
  };
};

export const DeleteRuntimeFieldProvider = ({ children, onConfirmDelete }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false, fieldsToDelete: [] });

  const { isModalOpen, fieldsToDelete } = state;
  const i18nTexts = geti18nTexts(fieldsToDelete);
  const { modalTitle, confirmButtonText, cancelButtonText, warningMultipleFields } = i18nTexts;
  const isMultiple = Boolean(fieldsToDelete.length > 1);

  const deleteField: DeleteFieldFunc = useCallback((fieldNames) => {
    setState({
      isModalOpen: true,
      fieldsToDelete: Array.isArray(fieldNames) ? fieldNames : [fieldNames],
    });
  }, []);

  const closeModal = useCallback(() => {
    setState({ isModalOpen: false, fieldsToDelete: [] });
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      await onConfirmDelete(fieldsToDelete);
      closeModal();
    } catch (e) {
      // silently fail as "onConfirmDelete" is responsible
      // to show a toast message if there is an error
    }
  }, [closeModal, onConfirmDelete, fieldsToDelete]);

  return (
    <>
      {children(deleteField)}

      {isModalOpen && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={modalTitle}
            data-test-subj="runtimeFieldDeleteConfirmModal"
            onCancel={closeModal}
            onConfirm={confirmDelete}
            cancelButtonText={cancelButtonText}
            buttonColor="danger"
            confirmButtonText={confirmButtonText}
          >
            {isMultiple && (
              <>
                <p>{warningMultipleFields}</p>
                <ul>
                  {fieldsToDelete.map((fieldName) => (
                    <li key={fieldName}>{fieldName}</li>
                  ))}
                </ul>
              </>
            )}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
