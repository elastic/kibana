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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus, isCancelableStatus } from '@kbn/workflows';
import { CancelExecutionButton } from './cancel_execution_button';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';
import { WorkflowExecutionListItem } from '../../workflow_execution_list/ui/workflow_execution_list_item';

const i18nTexts = {
  backToExecutions: i18n.translate('workflows.workflowStepExecutionList.backToExecution', {
    defaultMessage: 'Back to executions',
  }),
  done: i18n.translate('workflows.workflowStepExecutionList.done', {
    defaultMessage: 'Done',
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
    return (
      <EuiFlexGroup
        direction="column"
        justifyContent="flexStart"
        gutterSize="none"
        css={{ height: '100%' }}
      >
        {showBackButton && (
          <EuiFlexItem grow={false}>
            <EuiLink onClick={onClose} color="text" aria-label={i18nTexts.backToExecutions}>
              <EuiPanel paddingSize="m" hasShadow={false} css={styles.linkCss}>
                <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="sortLeft" />
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
          <EuiPanel paddingSize="m" hasShadow={false} css={{ overflow: 'hidden' }}>
            <EuiFlexGroup direction="column" gutterSize="m" css={{ height: '100%' }}>
              <EuiFlexItem grow={false}>
                <WorkflowExecutionListItem
                  status={execution?.status ?? ExecutionStatus.PENDING}
                  startedAt={execution?.startedAt ? new Date(execution.startedAt) : null}
                  duration={execution?.duration ?? null}
                />
              </EuiFlexItem>
              <EuiFlexItem css={{ overflowY: 'auto' }}>
                <WorkflowStepExecutionTree
                  definition={definition}
                  execution={execution ?? null}
                  error={error}
                  onStepExecutionClick={onStepExecutionClick}
                  selectedId={selectedStepExecutionId ?? null}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        {!showBackButton && (
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="none" />
            <EuiPanel paddingSize="m" hasShadow={false}>
              {execution && isCancelableStatus(execution.status) ? (
                <CancelExecutionButton executionId={execution.id} />
              ) : (
                <EuiButton
                  onClick={onClose}
                  iconType="check"
                  size="s"
                  fullWidth
                  aria-label={i18nTexts.done}
                >
                  {i18nTexts.done}
                </EuiButton>
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
