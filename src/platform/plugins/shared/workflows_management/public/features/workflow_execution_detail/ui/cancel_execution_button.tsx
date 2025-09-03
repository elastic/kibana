/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

interface CancelExecutionButtonProps {
  executionId: string;
}

export const CancelExecutionButton: React.FC<CancelExecutionButtonProps> = ({ executionId }) => {
  const { services } = useKibana();

  const handleClick = async () => {
    try {
      await services.http?.post(`/api/workflowExecutions/${executionId}/cancel`);
      services.notifications?.toasts.addSuccess({
        title: i18n.translate(
          'workflowsManagement.executionDetail.cancelButton.successNotificationTitle',
          {
            defaultMessage: 'Execution cancelled',
          }
        ),
      });
    } catch (error) {
      services.notifications?.toasts.addError?.(error, {
        title: i18n.translate(
          'workflowsManagement.executionDetail.cancelButton.errorNotificationTitle',
          {
            defaultMessage: 'Error cancelling execution',
          }
        ),
      });
    }
  };

  return (
    <EuiButton
      color="warning"
      iconType="cross"
      onClick={handleClick}
      data-test-subj="cancelExecutionButton"
    >
      <FormattedMessage
        id="workflowsManagement.executionDetail.cancelButton"
        defaultMessage="Cancel execution"
      />
    </EuiButton>
  );
};
