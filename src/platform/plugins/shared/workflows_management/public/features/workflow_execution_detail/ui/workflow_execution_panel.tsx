/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { CancelExecutionButton } from './cancel_execution_button';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';
import { useKibana } from '../../../hooks/use_kibana';
import { getTestRunTooltipContent } from '../../../shared/ui/workflow_action_buttons/get_workflow_tooltip_content';
import type { ChildWorkflowExecutionsMap } from '../model/use_child_workflow_executions';

const i18nTexts = {
  backToExecutions: i18n.translate('workflows.workflowStepExecutionList.backToExecution', {
    defaultMessage: 'Back to executions',
  }),
  done: i18n.translate('workflows.workflowStepExecutionList.done', {
    defaultMessage: 'Done',
  }),
  replay: i18n.translate('workflows.workflowStepExecutionList.replay', {
    defaultMessage: 'Run again',
  }),
};

export interface WorkflowExecutionPanelProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  selectedId: string | null;
  showBackButton?: boolean;
  onClose: () => void;
  childExecutionsMap?: ChildWorkflowExecutionsMap;
  isLoadingChildExecutions?: boolean;
}
export const WorkflowExecutionPanel = React.memo<WorkflowExecutionPanelProps>(
  ({
    execution,
    definition,
    showBackButton = true,
    error,
    onStepExecutionClick,
    selectedId: selectedStepExecutionId,
    onClose,
    childExecutionsMap,
    isLoadingChildExecutions,
  }) => {
    const styles = useMemoCss(componentStyles);
    const showCancelButton = Boolean(
      execution && !isTerminalStatus(execution.status) && !execution.finishedAt
    );
    const showDoneButton = Boolean(
      !showBackButton && execution && isTerminalStatus(execution.status)
    );

    return (
      <EuiFlexGroup
        direction="column"
        justifyContent="flexStart"
        gutterSize="none"
        css={{ height: '100%' }}
        data-test-subj="workflowExecutionPanel"
        data-execution-status={execution?.status}
      >
        {showBackButton && (
          <EuiFlexItem grow={false}>
            <EuiLink
              onClick={onClose}
              color="text"
              aria-label={i18nTexts.backToExecutions}
              data-test-subj="workflowBackToExecutionsLink"
            >
              <EuiPanel paddingSize="m" hasShadow={false} css={styles.linkCss}>
                <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="sortLeft" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>{i18nTexts.backToExecutions}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiLink>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
        )}

        <EuiFlexItem css={{ overflow: 'hidden' }}>
          <EuiPanel paddingSize="m" hasShadow={false} css={{ overflowY: 'auto' }}>
            <WorkflowStepExecutionTree
              definition={definition}
              execution={execution ?? null}
              error={error}
              onStepExecutionClick={onStepExecutionClick}
              selectedId={selectedStepExecutionId ?? null}
              childExecutionsMap={childExecutionsMap}
              isLoadingChildExecutions={isLoadingChildExecutions}
            />
          </EuiPanel>
        </EuiFlexItem>

        {execution && (showCancelButton || showDoneButton) && (
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="none" />
            <EuiPanel paddingSize="m" hasShadow={false}>
              {showCancelButton ? (
                <CancelExecutionButton
                  executionId={execution.id}
                  workflowId={execution.workflowId}
                  startedAt={execution.startedAt}
                />
              ) : (
                <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <ReplayExecutionButton
                      executionId={execution.id}
                      workflowId={execution.workflowId}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
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
                </EuiFlexGroup>
              )}
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
WorkflowExecutionPanel.displayName = 'WorkflowExecutionPanel';

const componentStyles = {
  linkCss: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&:hover': {
        background: euiTheme.colors.backgroundBaseInteractiveHover,
      },
    }),
};

const ReplayExecutionButton = React.memo<{
  executionId: string;
  workflowId?: string;
}>(({ executionId, workflowId }) => {
  const { application } = useKibana().services;
  const { canExecuteWorkflow } = useWorkflowsCapabilities();

  const replayExecution = useCallback(() => {
    if (!canExecuteWorkflow || !workflowId) {
      return;
    }

    application.navigateToApp('workflows', {
      path: `/${workflowId}?replayExecutionId=${executionId}`,
    });
  }, [application, canExecuteWorkflow, executionId, workflowId]);

  const isRunDisabled = !canExecuteWorkflow || !workflowId;
  const runDisabledTooltipContent = isRunDisabled
    ? getTestRunTooltipContent({
        isValid: true,
        canRunWorkflow: canExecuteWorkflow,
        isExecutionsTab: false,
      })
    : null;

  return (
    <EuiToolTip content={runDisabledTooltipContent ?? i18nTexts.replay} disableScreenReaderOutput>
      <EuiButtonIcon
        onClick={replayExecution}
        iconType="refresh"
        size="s"
        color="success"
        aria-label={i18nTexts.replay}
        display="base"
        data-test-subj="replayExecutionButton"
        disabled={isRunDisabled}
      />
    </EuiToolTip>
  );
});
ReplayExecutionButton.displayName = 'ReplayExecutionButton';
