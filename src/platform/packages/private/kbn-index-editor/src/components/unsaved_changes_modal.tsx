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
import { KibanaContextExtra } from '../types';

export interface UnsavedChangesModal {
  onClose: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModal> = ({ onClose }) => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const exitAttemptWithUnsavedFields = useObservable(
    indexUpdateService.exitAttemptWithUnsavedFields$,
    false
  );

  const closeWithoutSaving = () => {
    indexUpdateService.deleteUnsavedFields();
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
      title={
        <FormattedMessage id="indexEditor.warningModal.title" defaultMessage="Unsaved changes" />
      }
      onCancel={continueEditing}
      onConfirm={closeWithoutSaving}
      cancelButtonText={
        <FormattedMessage id="indexEditor.warningModal.cancel" defaultMessage="Cancel" />
      }
      confirmButtonText={
        <FormattedMessage id="indexEditor.warningModal.confirm" defaultMessage="OK" />
      }
    >
      <FormattedMessage
        id="indexEditor.warningModal.body"
        defaultMessage="You have unsaved columns. You need at least one value set on each new column for it to be saved. Are you sure you want to leave?"
      />
    </EuiConfirmModal>
  );
};
