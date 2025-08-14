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
import { KibanaContextExtra } from '../../types';

export interface UnsavedChangesModal {
  onClose: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModal> = ({ onClose }) => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const modalTitleId = useGeneratedHtmlId();

  const exitAttemptWithUnsavedFields = useObservable(
    indexUpdateService.exitAttemptWithUnsavedFields$,
    false
  );

  const closeWithoutSaving = () => {
    indexUpdateService.discardUnsavedChanges();
    onClose();
  };

  const continueEditing = () => {
    indexUpdateService.setExitAttemptWithUnsavedFields(false);
  };

  if (!exitAttemptWithUnsavedFields) {
    return null;
  }

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        <FormattedMessage
          id="indexEditor.warningModal.title"
          defaultMessage="You have unsaved changes"
        />
      }
      onCancel={continueEditing}
      onConfirm={closeWithoutSaving}
      cancelButtonText={
        <FormattedMessage id="indexEditor.warningModal.cancel" defaultMessage="Cancel" />
      }
      confirmButtonText={
        <FormattedMessage id="indexEditor.warningModal.confirm" defaultMessage="Yes" />
      }
    >
      <FormattedMessage
        id="indexEditor.warningModal.body_2"
        defaultMessage="Are you sure you want to leave without saving?"
      />
    </EuiConfirmModal>
  );
};
