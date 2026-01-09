/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useGeneratedHtmlId } from '@elastic/eui';
import type { KibanaContextExtra } from '../../types';

export interface UnsavedChangesModal {
  onClose: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModal> = ({ onClose }) => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const modalTitleId = useGeneratedHtmlId();

  const exitAttemptWithUnsavedFields = useObservable(
    indexUpdateService.exitAttemptWithUnsavedChanges$,
    { isActive: false }
  );

  const closeWithoutSaving = () => {
    indexUpdateService.discardUnsavedChanges();
    onClose();
    exitAttemptWithUnsavedFields.onExitCallback?.();
  };

  const continueEditing = () => {
    indexUpdateService.setExitAttemptWithUnsavedChanges(false);
  };

  if (!exitAttemptWithUnsavedFields.isActive) {
    return null;
  }

  return (
    <EuiConfirmModal
      data-test-subj="indexEditorUnsavedChangesModal"
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        <FormattedMessage
          id="indexEditor.warningModal.title"
          defaultMessage="Leave without saving?"
        />
      }
      onCancel={continueEditing}
      onConfirm={closeWithoutSaving}
      cancelButtonText={
        <FormattedMessage id="indexEditor.warningModal.cancel" defaultMessage="Resume editing" />
      }
      confirmButtonText={
        <FormattedMessage id="indexEditor.warningModal.confirm" defaultMessage="Leave" />
      }
      buttonColor="danger"
    >
      <FormattedMessage
        id="indexEditor.warningModal.body_2"
        defaultMessage="By leaving, you'll lose all unsaved changes."
      />
    </EuiConfirmModal>
  );
};
