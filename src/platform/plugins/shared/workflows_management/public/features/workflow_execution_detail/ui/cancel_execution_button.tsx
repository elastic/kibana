/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

interface CancelExecutionButtonProps {
  execution: WorkflowExecutionDto | null;
}

export const CancelExecutionButton: React.FC<CancelExecutionButtonProps> = ({ execution }) => {
  const { services } = useKibana();
  const canCancelWorkflow =
    services?.application?.capabilities.workflowsManagement.cancelWorkflowExecution;

  const shouldDisplay = useMemo(() => {
    if (!execution || !canCancelWorkflow) {
      return false;
    }

    const isCancellableStatus = [
      ExecutionStatus.RUNNING,
      ExecutionStatus.WAITING,
      ExecutionStatus.WAITING_FOR_INPUT,
      ExecutionStatus.PENDING,
    ].includes(execution?.status as ExecutionStatus);

    return isCancellableStatus;
  }, [execution, canCancelWorkflow]);

  const handleClick = async () => {
    try {
      await services.http?.post(`/api/workflowExecutions/${execution!.id}/cancel`);
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
    shouldDisplay && (
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
    )
  );
};
