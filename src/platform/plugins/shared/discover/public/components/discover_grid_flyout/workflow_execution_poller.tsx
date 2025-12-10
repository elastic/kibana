/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useWorkflowExecutionPolling } from '@kbn/workflows-ui';
import { ExecutionStatus, isTerminalStatus, isDangerousStatus } from '@kbn/workflows';
import type { CoreStart } from '@kbn/core/public';

interface WorkflowExecutionPollerProps {
  workflowExecutionId: string;
  workflowId: string;
  workflowName: string;
  core: CoreStart;
  initialToastId: string;
  onComplete?: () => void;
}

/**
 * Component that polls workflow execution and updates toast notification when execution completes
 */
export const WorkflowExecutionPoller: React.FC<WorkflowExecutionPollerProps> = ({
  workflowExecutionId,
  workflowId,
  workflowName,
  core,
  initialToastId,
  onComplete,
}) => {
  const { workflowExecution } = useWorkflowExecutionPolling(workflowExecutionId);
  const { notifications, application } = core;
  const hasUpdated = useRef(false);

  useEffect(() => {
    if (!workflowExecution || !isTerminalStatus(workflowExecution.status) || hasUpdated.current) {
      return;
    }

    hasUpdated.current = true;

    // Remove the initial toast
    notifications.toasts.remove(initialToastId);

    const executionUrl = application.getUrlForApp('workflows', {
      path: `/${workflowId}?tab=executions&executionId=${workflowExecutionId}`,
    });

    // Use workflow name from execution if available, otherwise use the passed name
    const displayWorkflowName = workflowExecution.workflowName || workflowName || workflowId;

    const isSuccess = workflowExecution.status === ExecutionStatus.COMPLETED;
    const isFailure = isDangerousStatus(workflowExecution.status);

    if (isSuccess) {
      notifications.toasts.addSuccess({
        color: 'success',
        iconType: 'check',
        title: i18n.translate('discover.runWorkflow.executionCompletedTitle', {
          defaultMessage: 'Workflow execution completed',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="discover.runWorkflow.executionCompletedMessage"
            defaultMessage="The workflow {workflowLink} executed successfully."
            values={{
              workflowLink: (
                <EuiLink
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    window.open(executionUrl, '_blank');
                  }}
                >
                  {displayWorkflowName}
                </EuiLink>
              ),
            }}
          />,
          core
        ),
        toastLifeTimeMs: 10000,
      });
    } else if (isFailure) {
      notifications.toasts.addDanger({
        color: 'danger',
        iconType: 'error',
        title: i18n.translate('discover.runWorkflow.executionFailedTitle', {
          defaultMessage: 'Workflow execution failed',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="discover.runWorkflow.executionFailedMessage"
            defaultMessage="The workflow {workflowLink} execution failed."
            values={{
              workflowLink: (
                <EuiLink
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    window.open(executionUrl, '_blank');
                  }}
                >
                  {displayWorkflowName}
                </EuiLink>
              ),
            }}
          />,
          core
        ),
        toastLifeTimeMs: 10000,
      });
    }

    // Call onComplete callback to clean up
    if (onComplete) {
      onComplete();
    }
  }, [
    workflowExecution,
    workflowExecutionId,
    workflowId,
    workflowName,
    core,
    initialToastId,
    notifications,
    application,
    onComplete,
  ]);

  return null;
};
