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

const geti18nTexts = (dataViewName?: string) => ({
  cancelButtonText: i18n.translate(
    'indexPatternEditor.editDataView.editConfirmationModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  confirmButtonText: i18n.translate(
    'indexPatternEditor.editDataView.editConfirmationModal.saveButtonLabel',
    {
      defaultMessage: 'Save',
    }
  ),
  warningEditingDataView: i18n.translate(
    'indexPatternEditor.editDataView.editConfirmationModal.warningEditingDataView',
    {
      defaultMessage:
        'Are you sure you want to edit this data view? Anything that depends upon this might not work as expected.',
    }
  ),
  typeConfirm: i18n.translate('indexPatternEditor.editDataView.editConfirmationModal.typeConfirm', {
    defaultMessage: 'Enter CHANGE to continue',
  }),
  titleConfirmChanges: i18n.translate(
    'indexPatternEditor.editDataView.editConfirmationModal.title',
    {
      defaultMessage: `Edit {name}`,
      values: {
        name: dataViewName ? `'${dataViewName}'` : 'data view',
      },
    }
  ),
});

interface Props {
  dataViewName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EditDataViewChangedModal: React.FC<Props> = ({
  dataViewName,
  onCancel,
  onConfirm,
}) => {
  const i18nTexts = geti18nTexts(dataViewName);
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
        title={i18nTexts.warningEditingDataView}
        iconType="alert"
        size="s"
        data-test-subj="editDataViewWarning"
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
