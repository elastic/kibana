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

interface OverrideWarningModalProps {
  onCancel: () => void;
  onContinue: () => void;
}

export const OverrideWarningModal: React.FC<OverrideWarningModalProps> = ({
  onCancel,
  onContinue,
}) => {
  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="indexEditor.overrideWarningModal.title"
          defaultMessage="This action will override your data"
        />
      }
      onCancel={onCancel}
      onConfirm={onContinue}
      cancelButtonText={
        <FormattedMessage id="indexEditor.overrideWarningModal.cancel" defaultMessage="Cancel" />
      }
      confirmButtonText={
        <FormattedMessage id="indexEditor.overrideWarningModal.confirm" defaultMessage="Continue" />
      }
    >
      <FormattedMessage
        id="indexEditor.overrideWarningModal.body"
        defaultMessage="This action will override the unsaved data in the index."
      />
    </EuiConfirmModal>
  );
};
