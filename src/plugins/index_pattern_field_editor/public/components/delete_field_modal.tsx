/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiFieldText } from '@elastic/eui';

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
    typeConfirm: i18n.translate(
      'indexPatternFieldEditor.deleteRuntimeField.confirmModal.typeConfirm',
      {
        defaultMessage: 'Type &apos;confirm&apos; to continue:',
      }
    ),
    warningRemovingFields: i18n.translate(
      'indexPatternFieldEditor.deleteRuntimeField.confirmModal.typeConfirm',
      {
        defaultMessage:
          'Warning: Removing fields may break searches or visualizations that rely on this field.',
      }
    ),
  };
};

export interface Props {
  fieldsToDelete: string[];
  closeModal: () => void;
  confirmDelete: () => void;
}

export function DeleteFieldModal({ fieldsToDelete, closeModal, confirmDelete }: Props) {
  const i18nTexts = geti18nTexts(fieldsToDelete);
  const { modalTitle, confirmButtonText, cancelButtonText, warningMultipleFields } = i18nTexts;
  const isMultiple = Boolean(fieldsToDelete.length > 1);
  const [confirmContent, setConfirmContent] = useState<string>();
  return (
    <EuiConfirmModal
      title={modalTitle}
      data-test-subj="runtimeFieldDeleteConfirmModal"
      onCancel={closeModal}
      onConfirm={confirmDelete}
      cancelButtonText={cancelButtonText}
      buttonColor="danger"
      confirmButtonText={confirmButtonText}
      confirmButtonDisabled={confirmContent?.toLowerCase() !== 'confirm'}
    >
      <p>{i18nTexts.warningRemovingFields}</p>
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
      <>
        <p>{i18nTexts.typeConfirm}</p>
        <EuiFieldText value={confirmContent} onChange={(e) => setConfirmContent(e.target.value)} />
      </>
    </EuiConfirmModal>
  );
}
