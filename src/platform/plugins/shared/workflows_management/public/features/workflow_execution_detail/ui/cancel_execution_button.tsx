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
import { useTelemetry } from '../../../hooks/use_telemetry';

interface CancelExecutionButtonProps {
  executionId: string;
  workflowId?: string;
  startedAt?: string;
}

export const CancelExecutionButton: React.FC<CancelExecutionButtonProps> = ({
  executionId,
  workflowId,
  startedAt,
}) => {
  const { application, http, notifications } = useKibana().services;
  const canCancelWorkflow = application?.capabilities.workflowsManagement.cancelWorkflowExecution;
  const telemetry = useTelemetry();

  const handleClick = async () => {
    // Calculate time from start to cancellation
    const timeToCancellation = startedAt ? Date.now() - new Date(startedAt).getTime() : undefined;

    try {
      await http?.post(`/api/workflowExecutions/${executionId}/cancel`);
      notifications?.toasts.addSuccess({
        title: i18n.translate(
          'workflowsManagement.executionDetail.cancelButton.successNotificationTitle',
          { defaultMessage: 'Execution cancelled' }
        ),
      });
      telemetry.reportWorkflowRunCancelled({
        workflowExecutionId: executionId,
        workflowId,
        timeToCancellation,
        origin: 'workflow_detail',
        error: undefined,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      notifications?.toasts.addError?.(error, {
        title: i18n.translate(
          'workflowsManagement.executionDetail.cancelButton.errorNotificationTitle',
          { defaultMessage: 'Error cancelling execution' }
        ),
      });
      telemetry.reportWorkflowRunCancelled({
        workflowExecutionId: executionId,
        workflowId,
        timeToCancellation,
        origin: 'workflow_detail',
        error: errorObj,
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
      fullWidth
    >
      <FormattedMessage
        id="workflowsManagement.executionDetail.cancelButton"
        defaultMessage="Cancel execution"
      />
    </EuiButton>
  );
};
