/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface CloseFilterEditorConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const strings = {
  getTitle: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.title', {
      defaultMessage: 'Add filter',
    }),
  getCancelButton: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.cancelButton', {
      defaultMessage: 'Cancel',
    }),
  getConfirmButton: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.confirmButton', {
      defaultMessage: 'Close',
    }),
  getWarningLabel: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.warningLabel', {
      defaultMessage: 'If you close this now you will lose any unsaved changes.',
    }),
  getConfirmationQuestionLabel: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.confirmationQuestionLabel', {
      defaultMessage: 'Are you sure you want to do this?',
    }),
};

export const CloseFilterEditorConfirmModal = memo(function CloseFilterEditorConfirmModal(
  props: CloseFilterEditorConfirmModalProps
) {
  return (
    <EuiConfirmModal
      title={strings.getTitle()}
      cancelButtonText={strings.getCancelButton()}
      confirmButtonText={strings.getConfirmButton()}
      buttonColor="primary"
      defaultFocusedButton="confirm"
      {...props}
    >
      <p>{strings.getWarningLabel()}</p>
      <p>{strings.getConfirmationQuestionLabel()}</p>
    </EuiConfirmModal>
  );
});
