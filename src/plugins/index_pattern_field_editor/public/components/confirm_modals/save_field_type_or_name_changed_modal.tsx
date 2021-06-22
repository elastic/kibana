/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiConfirmModal, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const geti18nTexts = (fieldName: string) => ({
  cancelButtonText: i18n.translate(
    'indexPatternFieldEditor.saveRuntimeField.confirmationModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  confirmButtonText: i18n.translate(
    'indexPatternFieldEditor.deleteRuntimeField.confirmationModal.saveButtonLabel',
    {
      defaultMessage: 'Save changes',
    }
  ),
  warningChangingFields: i18n.translate(
    'indexPatternFieldEditor.deleteRuntimeField.confirmModal.warningChangingFields',
    {
      defaultMessage:
        'Changing name or type can break searches and visualizations that rely on this field.',
    }
  ),
  typeConfirm: i18n.translate('indexPatternFieldEditor.saveRuntimeField.confirmModal.typeConfirm', {
    defaultMessage: 'Enter CHANGE to continue',
  }),
  titleConfirmChanges: i18n.translate(
    'indexPatternFieldEditor.saveRuntimeField.confirmModal.title',
    {
      defaultMessage: `Save changes to '{name}'`,
      values: {
        name: fieldName,
      },
    }
  ),
});

interface Props {
  fieldName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SaveFieldTypeOrNameChangedModal: React.FC<Props> = ({
  fieldName,
  onCancel,
  onConfirm,
}) => {
  const i18nTexts = geti18nTexts(fieldName);
  const [confirmContent, setConfirmContent] = useState<string>('');

  return (
    <EuiConfirmModal
      title={i18nTexts.titleConfirmChanges}
      data-test-subj="runtimeFieldSaveConfirmModal"
      cancelButtonText={i18nTexts.cancelButtonText}
      confirmButtonText={i18nTexts.confirmButtonText}
      confirmButtonDisabled={confirmContent?.toUpperCase() !== 'CHANGE'}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <EuiCallOut
        color="warning"
        title={i18nTexts.warningChangingFields}
        iconType="alert"
        size="s"
      />
      <EuiSpacer />
      <EuiFormRow label={i18nTexts.typeConfirm}>
        <EuiFieldText
          value={confirmContent}
          onChange={(e) => setConfirmContent(e.target.value)}
          data-test-subj="saveModalConfirmText"
        />
      </EuiFormRow>
    </EuiConfirmModal>
  );
};
