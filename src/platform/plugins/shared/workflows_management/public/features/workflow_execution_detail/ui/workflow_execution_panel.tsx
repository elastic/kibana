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
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { CancelExecutionButton } from './cancel_execution_button';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';
import { useKibana } from '../../../hooks/use_kibana';
import type { RerunWorkflowExecutionParams } from '../../../pages/executions/build_replay_inputs_from_execution_context';
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
  truncatedTitle: i18n.translate('workflows.workflowExecutionPanel.stepExecutionsTruncatedTitle', {
    defaultMessage: 'Step executions truncated',
  }),
};

export interface WorkflowExecutionPanelProps {
  execution: WorkflowExecutionDto | null;
  /** Paginated steps-list `total`; callout when this exceeds the loaded step rows. */
  stepExecutionsTotal?: number;
  definition: WorkflowYaml | null;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  selectedId: string | null;
  showBackButton?: boolean;
  onClose: () => void;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  childExecutionsMap?: ChildWorkflowExecutionsMap;
  isLoadingChildExecutions?: boolean;
}
export const WorkflowExecutionPanel = React.memo<WorkflowExecutionPanelProps>(
  ({
    execution,
    definition,
    stepExecutionsTotal = 0,
    showBackButton = true,
    error,
    onStepExecutionClick,
    selectedId: selectedStepExecutionId,
    onClose,
    onReRunExecution,
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
    const loadedCount = execution?.stepExecutions.length ?? 0;
    const omittedCount = Math.max(0, stepExecutionsTotal - loadedCount);

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
            {omittedCount > 0 && loadedCount > 0 && (
              <>
                <EuiCallOut
                  announceOnMount
                  color="warning"
                  iconType="warning"
                  size="s"
                  title={i18nTexts.truncatedTitle}
                  data-test-subj="workflowExecutionStepExecutionsTruncatedCallout"
                >
                  <FormattedMessage
                    id="workflows.workflowExecutionPanel.stepExecutionsTruncatedDescription"
                    defaultMessage="This execution has too much step data to load at once. {count, plural, one {# step execution was not loaded} other {# step executions were not loaded}}."
                    values={{ count: omittedCount }}
                  />
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            )}
            <WorkflowStepExecutionTree
              definition={definition}
              execution={execution ?? null}
              stepExecutionsTotal={stepExecutionsTotal}
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
                      context={execution.context}
                      executionId={execution.id}
                      onReRunExecution={onReRunExecution}
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
  context?: Record<string, unknown>;
  executionId: string;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  workflowId?: string;
}>(({ context, executionId, onReRunExecution, workflowId }) => {
  const { application } = useKibana().services;
  const { canExecuteWorkflow } = useWorkflowsCapabilities();

  const replayExecution = useCallback(() => {
    if (!canExecuteWorkflow || !workflowId) {
      return;
    }

    if (onReRunExecution) {
      void onReRunExecution({ workflowId, executionId, context });
      return;
    }

    application.navigateToApp('workflows', {
      path: `/${workflowId}?replayExecutionId=${executionId}`,
    });
  }, [application, canExecuteWorkflow, context, executionId, onReRunExecution, workflowId]);

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
