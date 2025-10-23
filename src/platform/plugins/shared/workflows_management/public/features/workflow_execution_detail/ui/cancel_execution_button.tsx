/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface CancelExecutionButtonProps {
  executionId: string;
}

export const CancelExecutionButton: React.FC<CancelExecutionButtonProps> = ({ executionId }) => {
  const { application, http, notifications } = useKibana().services;
  const canCancelWorkflow = application?.capabilities.workflowsManagement.cancelWorkflowExecution;

  const handleClick = async () => {
    try {
      await http?.post(`/api/workflowExecutions/${executionId}/cancel`);
      notifications?.toasts.addSuccess({
        title: i18n.translate(
          'workflowsManagement.executionDetail.cancelButton.successNotificationTitle',
          { defaultMessage: 'Execution cancelled' }
        ),
      });
    } catch (error) {
      notifications?.toasts.addError?.(error, {
        title: i18n.translate(
          'workflowsManagement.executionDetail.cancelButton.errorNotificationTitle',
          { defaultMessage: 'Error cancelling execution' }
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
      disabled={!canCancelWorkflow}
      size="s"
    >
      <FormattedMessage
        id="workflowsManagement.executionDetail.cancelButton"
        defaultMessage="Cancel execution"
      />
    </EuiButton>
  );
};
