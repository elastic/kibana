/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  EuiPopover,
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css, keyframes } from '@emotion/react';
import { useMutation } from '@kbn/react-query';
import { WorkflowSelector, useWorkflows } from '@kbn/workflows-ui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { CoreStart } from '@kbn/core/public';
import type { RunWorkflowResponseDto, WorkflowListDto } from '@kbn/workflows';
import type { WorkflowValidationResult } from '@kbn/workflows-ui';
import { WorkflowExecutionPoller } from './workflow_execution_poller';

interface RunWorkflowModalProps {
  document: DataTableRecord;
  core: CoreStart;
  isOpen: boolean;
  onClose: () => void;
  button: React.ReactElement;
}

/**
 * Helper function to start polling workflow execution outside of component lifecycle
 */
function startWorkflowExecutionPolling(
  workflowExecutionId: string,
  workflowId: string,
  workflowName: string,
  core: CoreStart,
  initialToastId: string
) {
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);

  const cleanup = () => {
    if (container.parentNode) {
      window.document.body.removeChild(container);
    }
  };

  // Create QueryClient for the poller
  const queryClient = new QueryClient();

  // Render poller with necessary providers - it will clean itself up when execution completes
  const pollerElement = core.rendering.addContext(
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>
        <WorkflowExecutionPoller
          workflowExecutionId={workflowExecutionId}
          workflowId={workflowId}
          workflowName={workflowName}
          core={core}
          initialToastId={initialToastId}
          onComplete={() => {
            ReactDOM.unmountComponentAtNode(container);
            cleanup();
          }}
        />
      </QueryClientProvider>
    </KibanaContextProvider>
  );

  ReactDOM.render(pollerElement, container);

  return cleanup;
}

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const spinningIconCss = css`
  animation: ${spin} 1s linear infinite;
`;

/**
 * Validates if required workflow inputs are present in the document
 */
function validateWorkflowInputs(
  workflow: WorkflowListDto['results'][number],
  document: DataTableRecord
): WorkflowValidationResult | null {
  const requiredInputs = workflow.definition?.inputs?.filter((input) => input.required) || [];
  if (requiredInputs.length === 0) return null;

  const docSource =
    (document.raw as { _source?: Record<string, unknown> })?._source ||
    (document.raw as Record<string, unknown>);
  const missingInputs = requiredInputs.filter(
    (input) => docSource[input.name] === undefined || docSource[input.name] === null
  );

  if (missingInputs.length > 0) {
    return {
      severity: 'warning',
      message: i18n.translate('discover.runWorkflow.missingRequiredInputs', {
        defaultMessage: 'Document is missing required inputs: {missingInputs}',
        values: { missingInputs: missingInputs.map((i) => i.name).join(', ') },
      }),
    };
  }

  return null;
}

export const RunWorkflowModal: React.FC<RunWorkflowModalProps> = ({
  document,
  core,
  isOpen,
  onClose,
  button,
}) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const { http, notifications, application } = core;

  // Fetch workflows to get the workflow name
  const { data: workflowsData } = useWorkflows({
    limit: 1000,
    page: 1,
    query: '',
  });

  const selectedWorkflow = workflowsData?.results?.find((w) => w.id === selectedWorkflowId);
  const workflowName = selectedWorkflow?.name || '';

  const runWorkflowMutation = useMutation<
    RunWorkflowResponseDto,
    Error,
    { workflowId: string; inputs: Record<string, unknown> }
  >({
    mutationFn: async ({ workflowId, inputs }) => {
      const response = await http.post<RunWorkflowResponseDto>(`/api/workflows/${workflowId}/run`, {
        body: JSON.stringify({ inputs }),
      });
      return response;
    },
  });

  const handleRun = useCallback(async () => {
    if (!selectedWorkflowId) return;

    const inputs = document.raw as Record<string, unknown>;

    try {
      const response = await runWorkflowMutation.mutateAsync({
        workflowId: selectedWorkflowId,
        inputs,
      });

      const executionUrl = application.getUrlForApp('workflows', {
        path: `/${selectedWorkflowId}?tab=executions&executionId=${response.workflowExecutionId}`,
      });

      // Show initial toast with link (in progress)
      const toast = notifications.toasts.add({
        color: 'primary',
        title: toMountPoint(
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="refresh" css={spinningIconCss} />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate('discover.runWorkflow.executionInProgressTitle', {
                defaultMessage: 'Workflow execution in progress',
              })}
            </EuiFlexItem>
          </EuiFlexGroup>,
          core
        ),
        text: toMountPoint(
          <FormattedMessage
            id="discover.runWorkflow.executionInProgressMessage"
            defaultMessage='The workflow "{workflowLink}" is currently executing.'
            values={{
              workflowLink: (
                <EuiLink
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    window.open(executionUrl, '_blank');
                  }}
                >
                  {workflowName || selectedWorkflowId}
                </EuiLink>
              ),
            }}
          />,
          core
        ),
        toastLifeTimeMs: 10000,
      });

      // Start polling workflow execution (rendered outside modal lifecycle)
      startWorkflowExecutionPolling(
        response.workflowExecutionId,
        selectedWorkflowId,
        workflowName,
        core,
        toast.id
      );

      onClose();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('discover.runWorkflow.errorTitle', {
          defaultMessage: 'Failed to run workflow',
        }),
        toastLifeTimeMs: 5000,
      });
    }
  }, [
    selectedWorkflowId,
    workflowName,
    document,
    runWorkflowMutation,
    notifications,
    application,
    onClose,
    core,
  ]);

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      anchorPosition="downLeft"
      panelPaddingSize="m"
      panelStyle={{ minWidth: 500, maxWidth: 600 }}
    >
      <EuiPanel paddingSize="m">
        <EuiText>
          <h3>
            <FormattedMessage
              id="discover.runWorkflow.modalTitle"
              defaultMessage="Run workflow on document"
            />
          </h3>
        </EuiText>
        <EuiSpacer size="m" />
        <WorkflowSelector
          selectedWorkflowId={selectedWorkflowId}
          onWorkflowChange={setSelectedWorkflowId}
          config={{
            validationFunction: (workflow) => validateWorkflowInputs(workflow, document),
          }}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage id="discover.runWorkflow.cancel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleRun}
              fill
              isLoading={runWorkflowMutation.isLoading}
              isDisabled={!selectedWorkflowId || runWorkflowMutation.isLoading}
            >
              <FormattedMessage id="discover.runWorkflow.run" defaultMessage="Run workflow" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPopover>
  );
};
