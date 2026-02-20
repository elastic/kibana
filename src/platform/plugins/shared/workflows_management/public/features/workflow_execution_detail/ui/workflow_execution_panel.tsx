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
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { isCancelableStatus, isTerminalStatus } from '@kbn/workflows';
import { CancelExecutionButton } from './cancel_execution_button';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';
import {
  setIsTestModalOpen,
  setReplayExecutionId,
} from '../../../entities/workflows/store/workflow_detail/slice';

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
  }) => {
    const styles = useMemoCss(componentStyles);
    const showCancelButton = useMemo<boolean>(
      () => Boolean(execution && isCancelableStatus(execution.status)),
      [execution]
    );
    const showDoneButton = useMemo<boolean>(
      () => Boolean(!showBackButton && execution && isTerminalStatus(execution.status)),
      [showBackButton, execution]
    );
    const showReplayButton = useMemo<boolean>(
      () => Boolean(execution && isTerminalStatus(execution.status)),
      [execution]
    );

    const showFooter = useMemo<boolean>(
      () => showDoneButton || showCancelButton || showReplayButton,
      [showDoneButton, showCancelButton, showReplayButton]
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
            />
          </EuiPanel>
        </EuiFlexItem>

        {execution && showFooter && (
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
                <>
                  {(showDoneButton || showReplayButton) && (
                    <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                      {showReplayButton && (
                        <EuiFlexItem grow={!showDoneButton}>
                          <ReplayExecutionButton
                            executionId={execution.id}
                            condensed={showDoneButton}
                          />
                        </EuiFlexItem>
                      )}
                      {showDoneButton && (
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
                      )}
                    </EuiFlexGroup>
                  )}
                </>
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

const ReplayExecutionButton = React.memo<{ executionId: string; condensed?: boolean }>(
  ({ executionId, condensed = false }) => {
    const dispatch = useDispatch();
    const replayExecution = useCallback(() => {
      dispatch(setReplayExecutionId(executionId));
      dispatch(setIsTestModalOpen(true));
    }, [executionId, dispatch]);

    if (condensed) {
      return (
        <EuiToolTip content={i18nTexts.replay} disableScreenReaderOutput>
          <EuiButtonIcon
            onClick={replayExecution}
            iconType="refresh"
            size="s"
            color="success"
            aria-label={i18nTexts.replay}
            display="base"
            data-test-subj="replayExecutionButton"
          />
        </EuiToolTip>
      );
    }
    return (
      <EuiButton
        onClick={replayExecution}
        iconType="refresh"
        size="s"
        color="success"
        aria-label={i18nTexts.replay}
        data-test-subj="replayExecutionButton"
        fullWidth
      >
        {i18nTexts.replay}
      </EuiButton>
    );
  }
);
ReplayExecutionButton.displayName = 'ReplayExecutionButton';
