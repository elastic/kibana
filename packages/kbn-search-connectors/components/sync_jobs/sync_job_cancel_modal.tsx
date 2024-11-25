/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiConfirmModal, EuiText, EuiCode, EuiSpacer, EuiConfirmModalProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export type CancelSyncModalProps = Omit<EuiConfirmModalProps, 'onConfirm'> & {
  onConfirmCb: (syncJobId: string) => void;
  syncJobId: string;
  errorMessages?: string[];
};

export const CancelSyncJobModal: React.FC<CancelSyncModalProps> = ({
  syncJobId,
  onCancel,
  onConfirmCb,
  isLoading,
}) => {
  return (
    <EuiConfirmModal
      title={i18n.translate('searchConnectors.syncJobs.cancelSyncModal.title', {
        defaultMessage: 'Cancel sync job',
      })}
      onCancel={onCancel}
      onConfirm={() => onConfirmCb(syncJobId)}
      cancelButtonText={i18n.translate('searchConnectors.syncJobs.cancelSyncModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('searchConnectors.syncJobs.cancelSyncModal.confirmButton', {
        defaultMessage: 'Confirm',
      })}
      buttonColor="danger"
      confirmButtonDisabled={isLoading}
      isLoading={isLoading}
    >
      <EuiText size="s">
        <FormattedMessage
          id="searchConnectors.syncJobs.cancelSyncModal.description"
          defaultMessage="Are you sure you want to cancel this sync job?"
        />
        <EuiSpacer size="m" />
        <FormattedMessage
          id="searchConnectors.syncJobs.cancelSyncModal.syncJobId"
          defaultMessage="Sync job ID:"
        />
        &nbsp;
        <EuiCode>{syncJobId}</EuiCode>
      </EuiText>
    </EuiConfirmModal>
  );
};
