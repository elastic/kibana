/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName, UserAvatar } from '@kbn/user-profile-components';
import { ExecutionStatus } from '@kbn/workflows';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations';
import { FormattedRelativeEnhanced } from '../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { getRunMode } from '../../workflow_execution_detail/lib/get_run_mode';

export const getExecutionTitleColor = (
  euiTheme: EuiThemeComputed,
  status: ExecutionStatus
): string | undefined => {
  if (
    status === ExecutionStatus.COMPLETED ||
    status === ExecutionStatus.FAILED ||
    status === ExecutionStatus.CANCELLED
  ) {
    return getExecutionStatusColors(euiTheme, status).color;
  }
};

const toValidDate = (value: Date | string | null | undefined): Date | null => {
  if (value == null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

interface WorkflowExecutionListItemProps {
  status: ExecutionStatus;
  isTestRun: boolean;
  /** Targeted step id for step-test runs; omitted for full-workflow test runs. */
  stepId?: string | null;
  /** ISO string preferred so poll refetches keep a stable prop for React.memo. */
  startedAt: Date | string | null;
  duration: number | null;
  executedByProfile?: UserProfileWithAvatar;
  executedByLabel?: string;
  triggeredBy?: string;
  showExecutor?: boolean;
  selected?: boolean;
  executionId?: string;
  onExecutionClick?: (executionId: string) => void;
}
export const WorkflowExecutionListItem = React.memo<WorkflowExecutionListItemProps>(
  ({
    status,
    isTestRun,
    stepId,
    startedAt: startedAtInput,
    duration,
    executedByProfile,
    executedByLabel,
    triggeredBy,
    showExecutor = false,
    selected,
    executionId,
    onExecutionClick,
  }) => {
    const { euiTheme } = useEuiTheme();
    const styles = useMemoCss(componentStyles);
    const getFormattedDate = useGetFormattedDateTime();
    const startedAt = useMemo(() => toValidDate(startedAtInput), [startedAtInput]);
    const formattedDate = startedAt ? getFormattedDate(startedAt) : null;
    const executedByDisplayName = executedByProfile?.user
      ? getUserDisplayName(executedByProfile.user)
      : executedByLabel;
    const formattedDuration = useMemo(() => {
      if (duration) {
        return formatDuration(duration);
      }
      return null;
    }, [duration]);

    const runModeInfo = useMemo(
      () => getRunMode({ isTestRun, stepId }),
      [isTestRun, stepId]
    );
    const runModeTooltip = useMemo(() => {
      if (runModeInfo.runMode === 'stepTest') {
        return i18n.translate('workflows.workflowExecutionListItem.stepTestIconTitle', {
          defaultMessage: 'Step test: {stepName}',
          values: { stepName: runModeInfo.stepTestTargetName ?? '' },
        });
      }
      if (runModeInfo.runMode === 'test') {
        return i18n.translate('workflows.workflowExecutionListItem.testRunIconTitle', {
          defaultMessage: 'Test run',
        });
      }
      return null;
    }, [runModeInfo]);

    const isSelectable = Boolean(onExecutionClick && executionId);
    const handleClick = useCallback(() => {
      if (onExecutionClick && executionId) {
        onExecutionClick(executionId);
      }
    }, [executionId, onExecutionClick]);

    const panelCss = useMemo(() => {
      if (selected) {
        return styles.selectedContainer;
      }
      if (isSelectable) {
        return styles.selectableContainer;
      }
    }, [selected, isSelectable, styles]);

    return (
      <EuiPanel
        onClick={isSelectable ? handleClick : undefined}
        hasShadow={false}
        paddingSize="m"
        hasBorder
        css={panelCss}
        data-test-subj="workflowExecutionListItem"
      >
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
        >
          <EuiFlexItem grow={false}>{getExecutionStatusIcon(euiTheme, status)}</EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiText
                  size="s"
                  css={{
                    fontWeight: euiTheme.font.weight.medium,
                    color: getExecutionTitleColor(euiTheme, status),
                  }}
                >
                  {getStatusLabel(status)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                {startedAt ? (
                  <EuiToolTip position="left" content={formattedDate}>
                    <EuiText size="xs" tabIndex={0} color="subdued" css={{ whiteSpace: 'nowrap' }}>
                      <FormattedRelativeEnhanced value={startedAt} />
                    </EuiText>
                  </EuiToolTip>
                ) : (
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="workflows.workflowExecutionListItem.notStarted"
                      defaultMessage="Not started"
                    />
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={styles.metadataContainer}>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs" wrap={false}>
              {status === ExecutionStatus.WAITING_FOR_INPUT && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning" data-test-subj="actionRequiredBadge">
                    {i18n.translate('workflowsManagement.executionListItem.actionRequiredBadge', {
                      defaultMessage: 'Action is required',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {runModeTooltip && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={runModeTooltip} position="top">
                    <span
                      tabIndex={0}
                      aria-label={runModeTooltip}
                      css={{ display: 'inline-flex', lineHeight: 0 }}
                      data-test-subj="workflowExecutionListItemRunModeIcon"
                    >
                      <EuiIcon type="flask" color="warning" aria-hidden={true} />
                    </span>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {showExecutor && executedByDisplayName && (
                <EuiFlexItem grow={false} css={styles.executedByContainer}>
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="flexEnd"
                    gutterSize="xs"
                    wrap={false}
                  >
                    <EuiFlexItem grow={false}>
                      <UserAvatar
                        user={executedByProfile?.user ?? { username: executedByDisplayName }}
                        avatar={executedByProfile?.data?.avatar}
                        size="s"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {executedByDisplayName}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false} css={styles.durationContainer}>
                {formattedDuration && (
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="flexEnd"
                    gutterSize="xs"
                    wrap={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="clock" color="subdued" aria-hidden={true} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {formattedDuration}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
WorkflowExecutionListItem.displayName = 'WorkflowExecutionListItem';

const componentStyles = {
  selectedContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    }),
  selectableContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
        // Prevent hover animation effect from affecting the panel
        boxShadow: 'none',
        transform: 'none',
      },
    }),
  metadataContainer: css({
    minWidth: '200px',
  }),
  executedByContainer: css({
    minWidth: '80px',
    justifyContent: 'flex-end',
  }),
  durationContainer: css({
    minWidth: '112px',
    width: '112px',
    justifyContent: 'flex-end',
  }),
};
