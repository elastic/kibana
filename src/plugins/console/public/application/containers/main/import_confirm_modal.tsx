/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal } from '@elastic/eui';
import { useEditorActionContext } from '../../contexts';
import { useServicesContext } from '../../contexts';

interface ImportConfirmModalProps {
  onClose: () => void;
  fileContent: string;
}

export const ImportConfirmModal = ({
  onClose,
  fileContent,
}: ImportConfirmModalProps) => {
  const dispatch = useEditorActionContext();
  const {
    services: { notifications },
  } = useServicesContext();

  const onConfirmImport = useCallback(() => {
    // Import the file content
    dispatch({
      type: 'setFileToImport',
      payload: fileContent as string,
    });

    notifications.toasts.addSuccess(
      i18n.translate('console.notification.fileImportedSuccessfully', {
        defaultMessage: `The file you selected has been imported successfully.`,
      })
    );

    onClose();
  }, [fileContent, onClose]);

  return (
    <EuiConfirmModal
      data-test-subj="importConfirmModal"
      title={i18n.translate('console.importConfirmModal.title', { defaultMessage: 'Import file contents' })}
      onCancel={onClose}
      onConfirm={onConfirmImport}
      cancelButtonText={i18n.translate('console.importConfirmModal.cancelButton', { defaultMessage: 'Cancel' })}
      confirmButtonText={i18n.translate('console.importConfirmModal.confirmButton', { defaultMessage: 'Import' })}
      buttonColor="primary"
      defaultFocusedButton="confirm"
    >
      <p>
        {i18n.translate('console.importConfirmModal.body', {
          defaultMessage: `Importing this file will replace the current request in the editor. Are you sure you want to proceed?`,
        })}
      </p>
    </EuiConfirmModal>
  );
};
