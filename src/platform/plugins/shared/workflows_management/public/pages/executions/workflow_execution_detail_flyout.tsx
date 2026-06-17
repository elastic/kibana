/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  euiFullHeight,
  EuiScreenReaderOnly,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import { WorkflowExecutionActionsMenu } from './workflow_executions_table_actions';
import { useWorkflowExecutionPolling } from '../../entities/workflows/model/use_workflow_execution_polling';
import { WorkflowDetailStoreProvider } from '../../entities/workflows/store/provider';
import { WorkflowExecutionDetail } from '../../features/workflow_execution_detail';

export interface WorkflowExecutionDetailFlyoutProps {
  executionId: string;
  onClose: () => void;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
}

const flyoutBodyCss = css`
  ${euiFullHeight()}
  .euiFlyoutBody__overflow {
    ${euiFullHeight()}
    min-height: 0;
  }

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
    min-height: 0;
  }
`;

const WorkflowExecutionDetailFlyoutContent = ({
  executionId,
  onClose,
  onReRunExecution,
  onViewAllExecutionsForWorkflow,
}: WorkflowExecutionDetailFlyoutProps) => {
  const { workflowExecution } = useWorkflowExecutionPolling(executionId);

  return (
    <>
      <EuiFlyoutBody css={flyoutBodyCss}>
        <WorkflowExecutionDetail
          executionId={executionId}
          onClose={onClose}
          onReRunExecution={onReRunExecution}
          showBackButton={false}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <WorkflowExecutionActionsMenu
              actionContext={{
                executionId,
                workflowId: workflowExecution?.workflowId,
                context: workflowExecution?.context,
              }}
              onReRunExecution={onReRunExecution}
              onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
              variant="takeAction"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

export const WorkflowExecutionDetailFlyout = React.memo<WorkflowExecutionDetailFlyoutProps>(
  ({ executionId, onClose, onReRunExecution, onViewAllExecutionsForWorkflow }) => {
    const flyoutTitleId = useGeneratedHtmlId({ prefix: 'workflowExecutionDetailFlyoutTitle' });

    return (
      <EuiFlyout
        aria-labelledby={flyoutTitleId}
        data-test-subj="workflowExecutionDetailFlyout"
        onClose={onClose}
        ownFocus
        size="l"
      >
        <EuiScreenReaderOnly>
          <h2 id={flyoutTitleId}>
            {i18n.translate('workflowsManagement.executionsPage.flyoutTitle', {
              defaultMessage: 'Execution details',
            })}
          </h2>
        </EuiScreenReaderOnly>
        <WorkflowDetailStoreProvider>
          <WorkflowExecutionDetailFlyoutContent
            executionId={executionId}
            onClose={onClose}
            onReRunExecution={onReRunExecution}
            onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
          />
        </WorkflowDetailStoreProvider>
      </EuiFlyout>
    );
  }
);
WorkflowExecutionDetailFlyout.displayName = 'WorkflowExecutionDetailFlyout';
