/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridControlColumn, EuiListGroupProps, EuiPopoverProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiListGroup,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import { getWorkflowExecutionActionContextFromDto } from './workflow_executions_table_cells';
import { useKibana } from '../../hooks/use_kibana';

export const WORKFLOW_EXECUTIONS_ACTIONS_COLUMN_ID = 'actions';
const WORKFLOW_EXECUTIONS_ACTIONS_COLUMN_WIDTH = 64;

export interface WorkflowExecutionActionContext {
  executionId?: string;
  workflowId?: string;
  context?: Record<string, unknown>;
}

export const getWorkflowExecutionActionContext = (
  execution?: WorkflowExecutionListItemDto
): WorkflowExecutionActionContext => {
  if (!execution) {
    return {};
  }

  return getWorkflowExecutionActionContextFromDto(execution);
};

const ActionsHeader = () => (
  <EuiText size="xs" css={{ fontWeight: 600, textAlign: 'center', width: '100%' }}>
    {i18n.translate('workflowsManagement.executionsPage.column.actions', {
      defaultMessage: 'Actions',
    })}
  </EuiText>
);

const menuAriaLabel = i18n.translate('workflowsManagement.executionsPage.actions.menuAriaLabel', {
  defaultMessage: 'Execution actions',
});

const useExecutionActionListItems = (
  { executionId, workflowId, context }: WorkflowExecutionActionContext,
  onClosePopover: () => void,
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void,
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => void
): EuiListGroupProps['listItems'] => {
  const { application } = useKibana().services;
  const { canExecuteWorkflow, canReadWorkflowExecution, canUpdateWorkflow } =
    useWorkflowsCapabilities();

  const navigateToWorkflow = useCallback(
    (path: string) => {
      onClosePopover();
      application.navigateToApp('workflows', { path });
    },
    [application, onClosePopover]
  );

  return useMemo<EuiListGroupProps['listItems']>(() => {
    const items: EuiListGroupProps['listItems'] = [];

    if (canExecuteWorkflow) {
      items.push({
        label: i18n.translate('workflowsManagement.executionsPage.actions.reRun', {
          defaultMessage: 'Re-run',
        }),
        iconType: 'refresh',
        onClick: () => {
          if (!workflowId || !onReRunExecution) {
            return;
          }

          onClosePopover();
          void onReRunExecution({ workflowId, executionId, context });
        },
        isDisabled: !workflowId || !onReRunExecution,
        'data-test-subj': 'workflowExecutionActionReRun',
      });
    }

    if (canUpdateWorkflow) {
      items.push({
        label: i18n.translate('workflowsManagement.executionsPage.actions.editWorkflow', {
          defaultMessage: 'Edit workflow',
        }),
        iconType: 'pencil',
        onClick: () => {
          if (!workflowId) {
            return;
          }
          navigateToWorkflow(`/${workflowId}`);
        },
        isDisabled: !workflowId,
        'data-test-subj': 'workflowExecutionActionEditWorkflow',
      });
    }

    if (canReadWorkflowExecution && onViewAllExecutionsForWorkflow) {
      items.push({
        label: i18n.translate('workflowsManagement.executionsPage.actions.viewAllExecutions', {
          defaultMessage: 'View all executions',
        }),
        iconType: 'eye',
        onClick: () => {
          if (!workflowId) {
            return;
          }
          onClosePopover();
          onViewAllExecutionsForWorkflow(workflowId);
        },
        isDisabled: !workflowId,
        'data-test-subj': 'workflowExecutionActionViewAllExecutions',
      });
    }

    return items;
  }, [
    canExecuteWorkflow,
    canReadWorkflowExecution,
    canUpdateWorkflow,
    context,
    executionId,
    navigateToWorkflow,
    onClosePopover,
    onReRunExecution,
    onViewAllExecutionsForWorkflow,
    workflowId,
  ]);
};

export interface WorkflowExecutionActionsMenuProps {
  actionContext: WorkflowExecutionActionContext;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => void;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
  variant?: 'icon' | 'takeAction';
}

export const WorkflowExecutionActionsMenu = ({
  actionContext,
  onReRunExecution,
  onViewAllExecutionsForWorkflow,
  variant = 'icon',
}: WorkflowExecutionActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'workflowExecutionActionsPopover' });
  const closePopover = useCallback(() => setIsOpen(false), []);
  const listItems = useExecutionActionListItems(
    actionContext,
    closePopover,
    onViewAllExecutionsForWorkflow,
    onReRunExecution
  );

  const showActionsLabel = i18n.translate(
    'workflowsManagement.executionsPage.actions.showActions',
    {
      defaultMessage: 'Show actions',
    }
  );

  const takeActionLabel = i18n.translate('workflowsManagement.executionsPage.actions.takeAction', {
    defaultMessage: 'Take action',
  });

  const anchorPosition: EuiPopoverProps['anchorPosition'] =
    variant === 'takeAction' ? 'upRight' : 'upCenter';

  if (listItems && listItems?.length === 0) {
    return null;
  }

  const button =
    variant === 'takeAction' ? (
      <EuiButton
        aria-label={takeActionLabel}
        data-test-subj="workflowExecutionTakeActionButton"
        iconSide="right"
        iconType="chevronSingleDown"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {takeActionLabel}
      </EuiButton>
    ) : (
      <EuiToolTip content={showActionsLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          aria-label={showActionsLabel}
          color="text"
          data-test-subj="workflowExecutionActionsButton"
          iconType="boxesVertical"
          onClick={() => setIsOpen((prev) => !prev)}
        />
      </EuiToolTip>
    );

  return (
    <EuiPopover
      id={popoverId}
      anchorPosition={anchorPosition}
      aria-label={menuAriaLabel}
      button={button}
      closePopover={closePopover}
      isOpen={isOpen}
      panelPaddingSize="none"
    >
      <EuiListGroup aria-label={menuAriaLabel} listItems={listItems} maxWidth={false} role="menu" />
    </EuiPopover>
  );
};

const WorkflowExecutionActionsPopover = ({
  onReRunExecution,
  onViewAllExecutionsForWorkflow,
  execution,
}: {
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => void;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
  execution: WorkflowExecutionListItemDto | undefined;
}) => (
  <WorkflowExecutionActionsMenu
    actionContext={getWorkflowExecutionActionContext(execution)}
    onReRunExecution={onReRunExecution}
    onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
    variant="icon"
  />
);

export const useWorkflowExecutionsTrailingControlColumns = (
  executions: WorkflowExecutionListItemDto[],
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void,
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => void
): EuiDataGridControlColumn[] =>
  useMemo(
    () => [
      {
        id: WORKFLOW_EXECUTIONS_ACTIONS_COLUMN_ID,
        width: WORKFLOW_EXECUTIONS_ACTIONS_COLUMN_WIDTH,
        headerCellRender: ActionsHeader,
        rowCellRender: ({ rowIndex }) => (
          <WorkflowExecutionActionsPopover
            onReRunExecution={onReRunExecution}
            onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
            execution={executions[rowIndex]}
          />
        ),
      },
    ],
    [executions, onReRunExecution, onViewAllExecutionsForWorkflow]
  );
