/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiTitle, useEuiTheme } from '@elastic/eui';
import React, { useCallback } from 'react';
import { hasActiveModifierKey } from '@kbn/shared-ux-utility';
import type { ChildWorkflowExecutionItem, WorkflowStepExecutionDto } from '@kbn/workflows';
import { isExecuteSyncStepType } from '@kbn/workflows';
import type { WorkflowExecutionLinkInfo } from '../../../hooks/navigation/use_navigate_to_execution';
import { useNavigateToExecution } from '../../../hooks/navigation/use_navigate_to_execution';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';

interface NestedWorkflowExecutionLinksProps {
  stepExecution?: WorkflowStepExecutionDto | null;
  childWorkflowExecution?: ChildWorkflowExecutionItem;
  parentWorkflowExecution?: WorkflowExecutionLinkInfo;
}

/** Links a workflow.execute step to its child run, or an injected child step to that run. */
export const NestedWorkflowExecutionLinks = React.memo<NestedWorkflowExecutionLinksProps>(
  ({ stepExecution, childWorkflowExecution, parentWorkflowExecution }) => {
    const { euiTheme } = useEuiTheme();
    const isWorkflowExecuteStep = isExecuteSyncStepType(stepExecution?.stepType);
    const workflowNav = useNavigateToExecution(
      childWorkflowExecution
        ? {
            workflowId: childWorkflowExecution.workflowId,
            executionId: childWorkflowExecution.executionId,
          }
        : { workflowId: '' }
    );
    const parentWorkflowNav = useNavigateToExecution(
      parentWorkflowExecution
        ? {
            workflowId: parentWorkflowExecution.workflowId,
            executionId: parentWorkflowExecution.executionId,
          }
        : { workflowId: '' }
    );

    const handleWorkflowLinkClick = useCallback(
      (e: React.MouseEvent) => {
        if (hasActiveModifierKey(e)) return;
        if (childWorkflowExecution) {
          e.preventDefault();
          workflowNav.navigate();
        }
      },
      [childWorkflowExecution, workflowNav]
    );

    const handleParentWorkflowLinkClick = useCallback(
      (e: React.MouseEvent) => {
        if (hasActiveModifierKey(e)) return;
        if (parentWorkflowExecution) {
          e.preventDefault();
          parentWorkflowNav.navigate();
        }
      },
      [parentWorkflowExecution, parentWorkflowNav]
    );

    if (isWorkflowExecuteStep && childWorkflowExecution) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            {getExecutionStatusIcon(euiTheme, childWorkflowExecution.status)}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                <EuiLink
                  href={workflowNav.href}
                  onClick={handleWorkflowLinkClick}
                  data-test-subj="workflowExecutionChildRunLink"
                >
                  {`${stepExecution?.stepType}: ${childWorkflowExecution.workflowName}`}
                </EuiLink>
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (parentWorkflowExecution) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            {getExecutionStatusIcon(euiTheme, parentWorkflowExecution.status)}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                <EuiLink
                  href={parentWorkflowNav.href}
                  onClick={handleParentWorkflowLinkClick}
                  data-test-subj="workflowExecutionOwningRunLink"
                >
                  {`${parentWorkflowExecution.workflowName}: ${stepExecution?.stepId}`}
                </EuiLink>
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return null;
  }
);
NestedWorkflowExecutionLinks.displayName = 'NestedWorkflowExecutionLinks';
