/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionListItem } from '../../workflow_execution_list/ui/workflow_execution_list_item';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';

const i18nTexts = {
  backToExecutions: i18n.translate('workflows.workflowStepExecutionList.backToExecution', {
    defaultMessage: 'Back to executions',
  }),
  done: i18n.translate('workflows.workflowStepExecutionList.done', {
    defaultMessage: 'Done',
  }),
};

export interface WorkflowExecutionListProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
  isLoading: boolean;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  selectedId: string | null;
  showBackButton?: boolean;
  onClose: () => void;
}

export const WorkflowStepExecutionList = ({
  execution: workflowExecution,
  definition: workflowDefinition,
  showBackButton = true,
  isLoading,
  error,
  onStepExecutionClick,
  selectedId: selectedStepExecutionId,
  onClose,
}: WorkflowExecutionListProps) => (
  <EuiPanel paddingSize="m" color="subdued" hasShadow={false} style={{ height: '100%' }}>
    <EuiFlexGroup
      direction="column"
      justifyContent="flexStart"
      gutterSize="s"
      style={{ height: '100%' }}
    >
      {showBackButton && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <EuiButtonEmpty
                  iconType="arrowLeft"
                  onClick={onClose}
                  size="xs"
                  aria-label={i18nTexts.backToExecutions}
                >
                  {i18nTexts.backToExecutions}
                </EuiButtonEmpty>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <WorkflowExecutionListItem
          status={workflowExecution?.status ?? ExecutionStatus.PENDING}
          startedAt={workflowExecution?.startedAt ? new Date(workflowExecution.startedAt) : null}
          duration={workflowExecution?.duration ?? null}
          selected={false}
          onClick={null}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <WorkflowStepExecutionTree
          definition={workflowDefinition}
          execution={workflowExecution ?? null}
          isLoading={isLoading}
          error={error}
          onStepExecutionClick={onStepExecutionClick}
          selectedId={selectedStepExecutionId ?? null}
        />
      </EuiFlexItem>

      {!showBackButton && (
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={onClose}
            iconType="check"
            size="s"
            fullWidth
            aria-label={i18nTexts.done}
          >
            {i18nTexts.done}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </EuiPanel>
);
